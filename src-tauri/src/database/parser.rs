use sqlparser::ast::{ColumnOption, Statement, TableConstraint};
use sqlparser::dialect::{GenericDialect, MySqlDialect, PostgreSqlDialect};
use sqlparser::parser::Parser;

use crate::types::{Column, Schema, Table};

pub fn parse_sql_to_schema(sql: &str, dialect: &str) -> Result<Schema, String> {
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
                    is_multivalued: false,
                    is_derived: false,
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
