use sqlx::mysql::MySqlPoolOptions;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Column as _, Row};

use crate::types::{Column, ColumnInfo, ConnectionParams, DatabaseInfo, QueryResult, Schema, Table, TableInfo};

pub fn build_connection_string(params: &ConnectionParams) -> String {
    if let Some(conn_str) = &params.connection_string {
        if !conn_str.is_empty() {
            return conn_str.clone();
        }
    }
    
    let host = params.host.as_deref().unwrap_or("localhost");
    let port = params.port.as_deref().unwrap_or(match params.db_type.as_str() {
        "postgresql" | "postgres" => "5432",
        "mysql" | "mariadb" => "3306",
        "mssql" => "1433",
        _ => "5432",
    });
    let database = params.database.as_deref().unwrap_or("");
    let user = params.user.as_deref().unwrap_or("");
    let password = params.password.as_deref().unwrap_or("");
    
    match params.db_type.as_str() {
        "postgresql" | "postgres" => {
            format!("postgres://{}:{}@{}:{}/{}", user, password, host, port, database)
        }
        "mysql" | "mariadb" => {
            format!("mysql://{}:{}@{}:{}/{}", user, password, host, port, database)
        }
        _ => String::new(),
    }
}

pub async fn get_postgres_schema(connection_string: &str) -> Result<Schema, String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Failed to connect to PostgreSQL: {}", e))?;

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

pub async fn get_mysql_schema(connection_string: &str) -> Result<Schema, String> {
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

pub async fn test_postgres_connection(connection_string: &str) -> Result<String, String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    pool.close().await;
    Ok("Connection successful!".to_string())
}

pub async fn test_mysql_connection(connection_string: &str) -> Result<String, String> {
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    pool.close().await;
    Ok("Connection successful!".to_string())
}

pub async fn get_postgres_databases(connection_string: &str) -> Result<Vec<DatabaseInfo>, String> {
    // Check if a specific database is in the connection string
    let url = url::Url::parse(connection_string)
        .map_err(|e| format!("Invalid connection string: {}", e))?;
    let specified_db = url.path().trim_start_matches('/').to_string();
    
    // If no database specified or it's empty, list all databases
    if specified_db.is_empty() {
        return get_postgres_all_databases(connection_string).await;
    }
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    let tables_query = r#"
        SELECT 
            t.table_name,
            t.table_schema
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
    "#;
    
    let table_rows = sqlx::query(tables_query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch tables: {}", e))?;
    
    let mut tables = Vec::new();
    
    for table_row in table_rows {
        let table_name: String = table_row.get("table_name");
        let schema_name: String = table_row.get("table_schema");
        
        let columns_query = r#"
            SELECT 
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
                CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT kcu.column_name, kcu.table_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name
            LEFT JOIN (
                SELECT kcu.column_name, kcu.table_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
            ) fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name
            WHERE c.table_name = $1 AND c.table_schema = $2
            ORDER BY c.ordinal_position
        "#;
        
        let column_rows = sqlx::query(columns_query)
            .bind(&table_name)
            .bind(&schema_name)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Failed to fetch columns: {}", e))?;
        
        let columns: Vec<ColumnInfo> = column_rows
            .iter()
            .map(|row| {
                ColumnInfo {
                    name: row.get("column_name"),
                    column_type: row.get("data_type"),
                    nullable: row.get::<String, _>("is_nullable") == "YES",
                    is_primary_key: row.get("is_primary_key"),
                    is_foreign_key: row.get("is_foreign_key"),
                    default_value: row.get("column_default"),
                }
            })
            .collect();
        
        tables.push(TableInfo {
            name: table_name,
            schema: Some(schema_name),
            columns,
        });
    }
    
    pool.close().await;
    
    Ok(vec![DatabaseInfo {
        name: "public".to_string(),
        tables,
    }])
}

// Get all databases from PostgreSQL server (when no specific database is provided)
async fn get_postgres_all_databases(connection_string: &str) -> Result<Vec<DatabaseInfo>, String> {
    // Connect to the default 'postgres' database to list all databases
    let base_url = connection_string.trim_end_matches('/');
    let postgres_url = format!("{}/postgres", base_url);
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&postgres_url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    // Get list of user databases (exclude system databases)
    let db_rows = sqlx::query(
        r#"
        SELECT datname 
        FROM pg_database 
        WHERE datistemplate = false 
        AND datname NOT IN ('postgres')
        ORDER BY datname
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to list databases: {}", e))?;
    
    pool.close().await;
    
    let mut databases = Vec::new();
    
    for db_row in db_rows {
        let db_name: String = db_row.get("datname");
        
        // Connect to each database to get its tables
        let db_url = format!("{}/{}", base_url, db_name);
        
        if let Ok(db_pool) = PgPoolOptions::new()
            .max_connections(1)
            .connect(&db_url)
            .await
        {
            let tables_query = r#"
                SELECT 
                    t.table_name,
                    t.table_schema
                FROM information_schema.tables t
                WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name
            "#;
            
            if let Ok(table_rows) = sqlx::query(tables_query).fetch_all(&db_pool).await {
                let mut tables = Vec::new();
                
                for table_row in table_rows {
                    let table_name: String = table_row.get("table_name");
                    let schema_name: String = table_row.get("table_schema");
                    
                    let columns_query = r#"
                        SELECT 
                            c.column_name,
                            c.data_type,
                            c.is_nullable,
                            c.column_default,
                            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
                            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
                        FROM information_schema.columns c
                        LEFT JOIN (
                            SELECT kcu.column_name, kcu.table_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.constraint_type = 'PRIMARY KEY'
                        ) pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name
                        LEFT JOIN (
                            SELECT kcu.column_name, kcu.table_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                        ) fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name
                        WHERE c.table_name = $1 AND c.table_schema = $2
                        ORDER BY c.ordinal_position
                    "#;
                    
                    if let Ok(column_rows) = sqlx::query(columns_query)
                        .bind(&table_name)
                        .bind(&schema_name)
                        .fetch_all(&db_pool)
                        .await
                    {
                        let columns: Vec<ColumnInfo> = column_rows
                            .iter()
                            .map(|row| {
                                ColumnInfo {
                                    name: row.get("column_name"),
                                    column_type: row.get("data_type"),
                                    nullable: row.get::<String, _>("is_nullable") == "YES",
                                    is_primary_key: row.get("is_primary_key"),
                                    is_foreign_key: row.get("is_foreign_key"),
                                    default_value: row.get("column_default"),
                                }
                            })
                            .collect();
                        
                        tables.push(TableInfo {
                            name: table_name,
                            schema: Some(schema_name),
                            columns,
                        });
                    }
                }
                
                databases.push(DatabaseInfo {
                    name: db_name,
                    tables,
                });
            }
            
            db_pool.close().await;
        }
    }
    
    Ok(databases)
}

pub async fn get_mysql_databases(connection_string: &str, db_name: &str) -> Result<Vec<DatabaseInfo>, String> {
    // If no database specified, list all databases
    if db_name.is_empty() {
        return get_mysql_all_databases(connection_string).await;
    }
    
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    let tables_query = r#"
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    "#;
    
    let table_rows = sqlx::query(tables_query)
        .bind(db_name)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch tables: {}", e))?;
    
    let mut tables = Vec::new();
    
    for table_row in table_rows {
        let table_name: String = table_row.get("TABLE_NAME");
        
        let columns_query = r#"
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                COLUMN_KEY
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        "#;
        
        let column_rows = sqlx::query(columns_query)
            .bind(db_name)
            .bind(&table_name)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Failed to fetch columns: {}", e))?;
        
        let columns: Vec<ColumnInfo> = column_rows
            .iter()
            .map(|row| {
                let column_key: String = row.get("COLUMN_KEY");
                ColumnInfo {
                    name: row.get("COLUMN_NAME"),
                    column_type: row.get("DATA_TYPE"),
                    nullable: row.get::<String, _>("IS_NULLABLE") == "YES",
                    is_primary_key: column_key == "PRI",
                    is_foreign_key: column_key == "MUL",
                    default_value: row.get("COLUMN_DEFAULT"),
                }
            })
            .collect();
        
        tables.push(TableInfo {
            name: table_name,
            schema: Some(db_name.to_string()),
            columns,
        });
    }
    
    pool.close().await;
    
    Ok(vec![DatabaseInfo {
        name: db_name.to_string(),
        tables,
    }])
}

// Get all databases from MySQL server (when no specific database is provided)
async fn get_mysql_all_databases(connection_string: &str) -> Result<Vec<DatabaseInfo>, String> {
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    // Get list of user databases (exclude system databases)
    let db_rows = sqlx::query(
        r#"
        SELECT SCHEMA_NAME 
        FROM information_schema.SCHEMATA 
        WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        ORDER BY SCHEMA_NAME
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to list databases: {}", e))?;
    
    let mut databases = Vec::new();
    
    for db_row in db_rows {
        let db_name: String = db_row.get("SCHEMA_NAME");
        
        let tables_query = r#"
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        "#;
        
        if let Ok(table_rows) = sqlx::query(tables_query)
            .bind(&db_name)
            .fetch_all(&pool)
            .await
        {
            let mut tables = Vec::new();
            
            for table_row in table_rows {
                let table_name: String = table_row.get("TABLE_NAME");
                
                let columns_query = r#"
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE,
                        COLUMN_DEFAULT,
                        COLUMN_KEY
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                    ORDER BY ORDINAL_POSITION
                "#;
                
                if let Ok(column_rows) = sqlx::query(columns_query)
                    .bind(&db_name)
                    .bind(&table_name)
                    .fetch_all(&pool)
                    .await
                {
                    let columns: Vec<ColumnInfo> = column_rows
                        .iter()
                        .map(|row| {
                            let column_key: String = row.get("COLUMN_KEY");
                            ColumnInfo {
                                name: row.get("COLUMN_NAME"),
                                column_type: row.get("DATA_TYPE"),
                                nullable: row.get::<String, _>("IS_NULLABLE") == "YES",
                                is_primary_key: column_key == "PRI",
                                is_foreign_key: column_key == "MUL",
                                default_value: row.get("COLUMN_DEFAULT"),
                            }
                        })
                        .collect();
                    
                    tables.push(TableInfo {
                        name: table_name,
                        schema: Some(db_name.clone()),
                        columns,
                    });
                }
            }
            
            databases.push(DatabaseInfo {
                name: db_name,
                tables,
            });
        }
    }
    
    pool.close().await;
    
    Ok(databases)
}

pub async fn execute_postgres_query(connection_string: &str, query: &str) -> Result<QueryResult, String> {
    let start_time = std::time::Instant::now();
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    let rows = sqlx::query(query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;
    
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    if rows.is_empty() {
        pool.close().await;
        return Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            row_count: 0,
            execution_time,
            error: None,
        });
    }
    
    let columns: Vec<String> = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();
    
    let result_rows: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            let mut obj = serde_json::Map::new();
            for (i, col) in columns.iter().enumerate() {
                let value: serde_json::Value = if let Ok(v) = row.try_get::<i64, _>(i) {
                    serde_json::Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<i32, _>(i) {
                    serde_json::Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<f64, _>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.try_get::<bool, _>(i) {
                    serde_json::Value::Bool(v)
                } else if let Ok(v) = row.try_get::<String, _>(i) {
                    serde_json::Value::String(v)
                } else if let Ok(v) = row.try_get::<Option<i64>, _>(i) {
                    v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<i32>, _>(i) {
                    v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<f64>, _>(i) {
                    v.map(|n| serde_json::json!(n)).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<bool>, _>(i) {
                    v.map(serde_json::Value::Bool).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<String>, _>(i) {
                    v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null)
                } else {
                    serde_json::Value::Null
                };
                obj.insert(col.clone(), value);
            }
            serde_json::Value::Object(obj)
        })
        .collect();
    
    let row_count = result_rows.len();
    pool.close().await;
    
    Ok(QueryResult {
        columns,
        rows: result_rows,
        row_count,
        execution_time,
        error: None,
    })
}

pub async fn execute_mysql_query(connection_string: &str, query: &str) -> Result<QueryResult, String> {
    let start_time = std::time::Instant::now();
    
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(connection_string)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    let rows = sqlx::query(query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;
    
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    if rows.is_empty() {
        pool.close().await;
        return Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            row_count: 0,
            execution_time,
            error: None,
        });
    }
    
    let columns: Vec<String> = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();
    
    let result_rows: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            let mut obj = serde_json::Map::new();
            for (i, col) in columns.iter().enumerate() {
                let value: serde_json::Value = if let Ok(v) = row.try_get::<i64, _>(i) {
                    serde_json::Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<i32, _>(i) {
                    serde_json::Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<f64, _>(i) {
                    serde_json::json!(v)
                } else if let Ok(v) = row.try_get::<bool, _>(i) {
                    serde_json::Value::Bool(v)
                } else if let Ok(v) = row.try_get::<String, _>(i) {
                    serde_json::Value::String(v)
                } else if let Ok(v) = row.try_get::<Option<i64>, _>(i) {
                    v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<i32>, _>(i) {
                    v.map(|n| serde_json::Value::Number(n.into())).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<f64>, _>(i) {
                    v.map(|n| serde_json::json!(n)).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<bool>, _>(i) {
                    v.map(serde_json::Value::Bool).unwrap_or(serde_json::Value::Null)
                } else if let Ok(v) = row.try_get::<Option<String>, _>(i) {
                    v.map(serde_json::Value::String).unwrap_or(serde_json::Value::Null)
                } else {
                    serde_json::Value::Null
                };
                obj.insert(col.clone(), value);
            }
            serde_json::Value::Object(obj)
        })
        .collect();
    
    let row_count = result_rows.len();
    pool.close().await;
    
    Ok(QueryResult {
        columns,
        rows: result_rows,
        row_count,
        execution_time,
        error: None,
    })
}
