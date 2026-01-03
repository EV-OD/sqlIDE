use serde::{Deserialize, Serialize};
use sqlparser::ast::{ColumnOption, Statement, TableConstraint};
use sqlparser::dialect::{GenericDialect, MySqlDialect, PostgreSqlDialect};
use sqlparser::parser::Parser;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::postgres::PgPoolOptions;
use sqlx::Row;

// Types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    #[serde(rename = "isPrimaryKey")]
    pub is_primary_key: bool,
    #[serde(rename = "isForeignKey")]
    pub is_foreign_key: bool,
    #[serde(rename = "foreignKeyTargetTable")]
    pub foreign_key_target_table: Option<String>,
    #[serde(rename = "foreignKeyTargetColumn")]
    pub foreign_key_target_column: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schema {
    pub tables: Vec<Table>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MermaidConfig {
    pub theme: Option<String>,
    pub curve: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    #[serde(rename = "type")]
    pub db_type: String,
    #[serde(rename = "connectionString")]
    pub connection_string: Option<String>,
    pub sql: Option<String>,
    pub style: Option<String>,
    pub config: Option<MermaidConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateResponse {
    #[serde(rename = "mermaidCode")]
    pub mermaid_code: String,
}

// SQL Parser
fn parse_sql_to_schema(sql: &str, dialect: &str) -> Result<Schema, String> {
    let dialect_box: Box<dyn sqlparser::dialect::Dialect> = match dialect {
        "mysql" | "mariadb" => Box::new(MySqlDialect {}),
        "postgres" | "postgresql" => Box::new(PostgreSqlDialect {}),
        _ => Box::new(GenericDialect {}),
    };

    let ast = Parser::parse_sql(&*dialect_box, sql).map_err(|e| format!("SQL Parse Error: {}", e))?;

    let mut tables: Vec<Table> = Vec::new();

    for statement in ast {
        if let Statement::CreateTable(create_table) = statement {
            let table_name = create_table.name.to_string();
            let mut columns: Vec<Column> = Vec::new();
            let mut pk_columns: Vec<String> = Vec::new();
            let mut fk_map: std::collections::HashMap<String, (String, String)> =
                std::collections::HashMap::new();

            // First pass: collect constraints
            for constraint in &create_table.constraints {
                match constraint {
                    TableConstraint::PrimaryKey { columns: pk_cols, .. } => {
                        for col in pk_cols {
                            pk_columns.push(col.value.clone());
                        }
                    }
                    TableConstraint::ForeignKey {
                        columns: fk_cols,
                        foreign_table,
                        referred_columns,
                        ..
                    } => {
                        for (i, fk_col) in fk_cols.iter().enumerate() {
                            let target_table = foreign_table.to_string();
                            let target_col = referred_columns
                                .get(i)
                                .map(|c| c.value.clone())
                                .unwrap_or_default();
                            fk_map.insert(fk_col.value.clone(), (target_table, target_col));
                        }
                    }
                    _ => {}
                }
            }

            // Second pass: process columns
            for col_def in &create_table.columns {
                let col_name = col_def.name.value.clone();
                let col_type = col_def.data_type.to_string();

                let mut is_pk = pk_columns.contains(&col_name);
                let mut is_fk = fk_map.contains_key(&col_name);
                let mut fk_target_table: Option<String> = None;
                let mut fk_target_column: Option<String> = None;

                // Check inline constraints
                for option in &col_def.options {
                    match &option.option {
                        ColumnOption::Unique { is_primary, .. } => {
                            if *is_primary {
                                is_pk = true;
                            }
                        }
                        ColumnOption::ForeignKey {
                            foreign_table,
                            referred_columns,
                            ..
                        } => {
                            is_fk = true;
                            fk_target_table = Some(foreign_table.to_string());
                            fk_target_column =
                                referred_columns.first().map(|c| c.value.clone());
                        }
                        _ => {}
                    }
                }

                // Apply FK from table constraints
                if let Some((target_table, target_col)) = fk_map.get(&col_name) {
                    is_fk = true;
                    fk_target_table = Some(target_table.clone());
                    fk_target_column = Some(target_col.clone());
                }

                columns.push(Column {
                    name: col_name,
                    column_type: col_type,
                    is_primary_key: is_pk,
                    is_foreign_key: is_fk,
                    foreign_key_target_table: fk_target_table,
                    foreign_key_target_column: fk_target_column,
                });
            }

            tables.push(Table {
                name: table_name,
                columns,
            });
        }
    }

    Ok(Schema { tables })
}

// Database Introspection
async fn get_postgres_schema(connection_string: &str) -> Result<Schema, String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Failed to connect to PostgreSQL: {}", e))?;

    // Get columns
    let columns_rows = sqlx::query(
        r#"
        SELECT 
            table_name, 
            column_name, 
            data_type 
        FROM 
            information_schema.columns 
        WHERE 
            table_schema = 'public' 
        ORDER BY 
            table_name, ordinal_position
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to query columns: {}", e))?;

    // Get constraints
    let constraints_rows = sqlx::query(
        r#"
        SELECT
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_type,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
            AND tc.table_schema = 'public'
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to query constraints: {}", e))?;

    let mut tables_map: std::collections::HashMap<String, Table> =
        std::collections::HashMap::new();

    // Initialize tables and columns
    for row in columns_rows {
        let table_name: String = row.get("table_name");
        let column_name: String = row.get("column_name");
        let data_type: String = row.get("data_type");

        let table = tables_map.entry(table_name.clone()).or_insert_with(|| Table {
            name: table_name,
            columns: Vec::new(),
        });

        table.columns.push(Column {
            name: column_name,
            column_type: data_type,
            is_primary_key: false,
            is_foreign_key: false,
            foreign_key_target_table: None,
            foreign_key_target_column: None,
        });
    }

    // Apply constraints
    for row in constraints_rows {
        let table_name: String = row.get("table_name");
        let column_name: String = row.get("column_name");
        let constraint_type: String = row.get("constraint_type");
        let foreign_table: Option<String> = row.try_get("foreign_table_name").ok();
        let foreign_column: Option<String> = row.try_get("foreign_column_name").ok();

        if let Some(table) = tables_map.get_mut(&table_name) {
            if let Some(col) = table.columns.iter_mut().find(|c| c.name == column_name) {
                if constraint_type == "PRIMARY KEY" {
                    col.is_primary_key = true;
                } else if constraint_type == "FOREIGN KEY" {
                    col.is_foreign_key = true;
                    col.foreign_key_target_table = foreign_table;
                    col.foreign_key_target_column = foreign_column;
                }
            }
        }
    }

    pool.close().await;

    Ok(Schema {
        tables: tables_map.into_values().collect(),
    })
}

async fn get_mysql_schema(connection_string: &str) -> Result<Schema, String> {
    // Extract database name from connection string
    let url = url::Url::parse(connection_string)
        .map_err(|e| format!("Invalid connection string: {}", e))?;
    let database_name = url.path().trim_start_matches('/').to_string();

    if database_name.is_empty() {
        return Err("Database name not found in connection string".to_string());
    }

    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Failed to connect to MySQL: {}", e))?;

    // Get columns
    let columns_rows = sqlx::query(
        r#"
        SELECT 
            TABLE_NAME as table_name, 
            COLUMN_NAME as column_name, 
            DATA_TYPE as data_type 
        FROM 
            INFORMATION_SCHEMA.COLUMNS 
        WHERE 
            TABLE_SCHEMA = ? 
        ORDER BY 
            TABLE_NAME, ORDINAL_POSITION
        "#,
    )
    .bind(&database_name)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to query columns: {}", e))?;

    // Get constraints
    let constraints_rows = sqlx::query(
        r#"
        SELECT 
            kcu.TABLE_NAME as table_name,
            kcu.COLUMN_NAME as column_name,
            tc.CONSTRAINT_TYPE as constraint_type,
            kcu.REFERENCED_TABLE_NAME as foreign_table_name,
            kcu.REFERENCED_COLUMN_NAME as foreign_column_name
        FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        JOIN 
            INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
            ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME 
            AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
        WHERE 
            kcu.TABLE_SCHEMA = ? 
            AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY')
        "#,
    )
    .bind(&database_name)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to query constraints: {}", e))?;

    let mut tables_map: std::collections::HashMap<String, Table> =
        std::collections::HashMap::new();

    // Initialize tables and columns
    for row in columns_rows {
        let table_name: String = row.get("table_name");
        let column_name: String = row.get("column_name");
        let data_type: String = row.get("data_type");

        let table = tables_map.entry(table_name.clone()).or_insert_with(|| Table {
            name: table_name,
            columns: Vec::new(),
        });

        table.columns.push(Column {
            name: column_name,
            column_type: data_type,
            is_primary_key: false,
            is_foreign_key: false,
            foreign_key_target_table: None,
            foreign_key_target_column: None,
        });
    }

    // Apply constraints
    for row in constraints_rows {
        let table_name: String = row.get("table_name");
        let column_name: String = row.get("column_name");
        let constraint_type: String = row.get("constraint_type");
        let foreign_table: Option<String> = row.try_get("foreign_table_name").ok();
        let foreign_column: Option<String> = row.try_get("foreign_column_name").ok();

        if let Some(table) = tables_map.get_mut(&table_name) {
            if let Some(col) = table.columns.iter_mut().find(|c| c.name == column_name) {
                if constraint_type == "PRIMARY KEY" {
                    col.is_primary_key = true;
                } else if constraint_type == "FOREIGN KEY" {
                    col.is_foreign_key = true;
                    col.foreign_key_target_table = foreign_table;
                    col.foreign_key_target_column = foreign_column;
                }
            }
        }
    }

    pool.close().await;

    Ok(Schema {
        tables: tables_map.into_values().collect(),
    })
}

// Mermaid Generator
fn sanitize_id(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect()
}

fn sanitize_name(name: &str) -> String {
    if name.chars().any(|c| !c.is_alphanumeric() && c != '_') {
        format!("\"{}\"", name)
    } else {
        name.to_string()
    }
}

fn sanitize_type(type_str: &str) -> String {
    type_str.replace(' ', "_")
}

fn get_theme_colors(theme: &str) -> (&'static str, &'static str, &'static str) {
    match theme {
        "dark" => (
            "fill:#1f2937,stroke:#60a5fa,stroke-width:2px,color:#fff",
            "fill:#374151,stroke:#fb923c,stroke-width:1px,color:#fff",
            "fill:#374151,stroke:#c084fc,stroke-width:2px,color:#fff",
        ),
        "forest" => (
            "fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px",
            "fill:#fff3e0,stroke:#ef6c00,stroke-width:1px",
            "fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px",
        ),
        "neutral" => (
            "fill:#f3f4f6,stroke:#4b5563,stroke-width:2px",
            "fill:#ffffff,stroke:#9ca3af,stroke-width:1px",
            "fill:#f9fafb,stroke:#6b7280,stroke-width:2px",
        ),
        _ => (
            "fill:#e3f2fd,stroke:#1565c0,stroke-width:2px",
            "fill:#fff3e0,stroke:#ef6c00,stroke-width:1px",
            "fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px",
        ),
    }
}

fn generate_mermaid_crows_foot(schema: &Schema) -> String {
    let mut code = String::from("erDiagram\n");

    // Generate Entities
    for table in &schema.tables {
        code.push_str(&format!("    {} {{\n", sanitize_name(&table.name)));
        for col in &table.columns {
            let mut keys = Vec::new();
            if col.is_primary_key {
                keys.push("PK");
            }
            if col.is_foreign_key {
                keys.push("FK");
            }
            let key_string = if keys.is_empty() {
                String::new()
            } else {
                format!(" {}", keys.join(","))
            };
            code.push_str(&format!(
                "        {} {}{}\n",
                sanitize_type(&col.column_type),
                sanitize_name(&col.name),
                key_string
            ));
        }
        code.push_str("    }\n");
    }

    // Generate Relationships
    for table in &schema.tables {
        for col in &table.columns {
            if col.is_foreign_key {
                if let Some(ref target_table) = col.foreign_key_target_table {
                    let source = sanitize_name(&table.name);
                    let target = sanitize_name(target_table);
                    code.push_str(&format!(
                        "    {} }}o--|| {} : \"{}\"\n",
                        source, target, col.name
                    ));
                }
            }
        }
    }

    code
}

fn generate_mermaid_chen(schema: &Schema, theme: &str) -> String {
    let mut code = String::from("flowchart TD\n");

    let (entity_color, attribute_color, relationship_color) = get_theme_colors(theme);

    code.push_str(&format!("    classDef entity {};\n", entity_color));
    code.push_str(&format!("    classDef attribute {};\n", attribute_color));
    code.push_str(&format!("    classDef relationship {};\n", relationship_color));

    for table in &schema.tables {
        let entity_id = format!("E_{}", sanitize_id(&table.name));
        code.push_str(&format!(
            "    {}[\"{}\"]:::entity\n",
            entity_id, table.name
        ));

        for col in &table.columns {
            let attr_id = format!("A_{}_{}", sanitize_id(&table.name), sanitize_id(&col.name));
            let label = if col.is_primary_key {
                format!("<u>{}</u>", col.name)
            } else {
                col.name.clone()
            };

            code.push_str(&format!("    {}([\"{}\"]):::attribute\n", attr_id, label));
            code.push_str(&format!("    {} --- {}\n", entity_id, attr_id));
        }
    }

    // Relationships
    let mut rel_counter = 0;
    for table in &schema.tables {
        for col in &table.columns {
            if col.is_foreign_key {
                if let Some(ref target_table) = col.foreign_key_target_table {
                    let source_id = format!("E_{}", sanitize_id(&table.name));
                    let target_id = format!("E_{}", sanitize_id(target_table));
                    let rel_id = format!("R_{}", rel_counter);
                    rel_counter += 1;

                    code.push_str(&format!(
                        "    {}{{\"{}\"}}:::relationship\n",
                        rel_id, col.name
                    ));
                    code.push_str(&format!("    {} ---|N| {}\n", source_id, rel_id));
                    code.push_str(&format!("    {} ---|1| {}\n", rel_id, target_id));
                }
            }
        }
    }

    code
}

fn generate_mermaid_code(
    schema: &Schema,
    style: &str,
    config: &MermaidConfig,
) -> String {
    let theme = config.theme.as_deref().unwrap_or("default");
    let curve = config.curve.as_deref().unwrap_or("basis");

    let init_directive = if style == "chen" {
        format!(
            "%%{{init: {{'theme': '{}', 'flowchart': {{'curve': '{}'}}}}}}%%\n",
            theme, curve
        )
    } else {
        format!("%%{{init: {{'theme': '{}'}}}}%%\n", theme)
    };

    let diagram_code = if style == "chen" {
        generate_mermaid_chen(schema, theme)
    } else {
        generate_mermaid_crows_foot(schema)
    };

    format!("{}{}", init_directive, diagram_code)
}

// Tauri Commands
#[tauri::command]
async fn generate_diagram(request: GenerateRequest) -> Result<GenerateResponse, String> {
    let style = request.style.as_deref().unwrap_or("chen");
    let config = request.config.unwrap_or(MermaidConfig {
        theme: Some("default".to_string()),
        curve: Some("basis".to_string()),
    });

    let schema = if request.db_type == "sql" {
        // Parse SQL directly
        let sql = request
            .sql
            .as_ref()
            .ok_or("SQL code is required")?;
        parse_sql_to_schema(sql, "postgres")?
    } else {
        // Connect to database
        let conn_string = request
            .connection_string
            .as_ref()
            .ok_or("Connection string is required")?;

        match request.db_type.as_str() {
            "postgres" => get_postgres_schema(conn_string).await?,
            "mysql" | "mariadb" => get_mysql_schema(conn_string).await?,
            _ => return Err(format!("Unsupported database type: {}", request.db_type)),
        }
    };

    let mermaid_code = generate_mermaid_code(&schema, style, &config);

    Ok(GenerateResponse { mermaid_code })
}

#[tauri::command]
async fn test_connection(db_type: String, connection_string: String) -> Result<String, String> {
    match db_type.as_str() {
        "postgres" => {
            let pool = PgPoolOptions::new()
                .max_connections(1)
                .connect(&connection_string)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            pool.close().await;
            Ok("Connection successful!".to_string())
        }
        "mysql" | "mariadb" => {
            let pool = MySqlPoolOptions::new()
                .max_connections(1)
                .connect(&connection_string)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            pool.close().await;
            Ok("Connection successful!".to_string())
        }
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}

#[tauri::command]
fn parse_sql(sql: String, dialect: String) -> Result<Schema, String> {
    parse_sql_to_schema(&sql, &dialect)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            generate_diagram,
            test_connection,
            parse_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
