use serde::{Deserialize, Serialize};

// ER Diagram Types
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

// SQL Editor Types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub tables: Vec<TableInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub schema: Option<String>,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    pub nullable: bool,
    #[serde(rename = "isPrimaryKey")]
    pub is_primary_key: bool,
    #[serde(rename = "isForeignKey")]
    pub is_foreign_key: bool,
    #[serde(rename = "defaultValue")]
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    #[serde(rename = "rowCount")]
    pub row_count: usize,
    #[serde(rename = "executionTime")]
    pub execution_time: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionParams {
    #[serde(rename = "dbType")]
    pub db_type: String,
    pub host: Option<String>,
    pub port: Option<String>,
    pub database: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    #[serde(rename = "connectionString")]
    pub connection_string: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}
