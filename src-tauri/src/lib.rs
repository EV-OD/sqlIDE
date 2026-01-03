mod types;
mod database;
mod mermaid;
mod files;

use types::*;
use database::*;
use mermaid::generate_mermaid_code;

// Tauri Commands - ER Diagram Generation
#[tauri::command]
async fn generate_diagram(request: GenerateRequest) -> Result<GenerateResponse, String> {
    let style = request.style.as_deref().unwrap_or("chen");
    let config = request.config.unwrap_or(MermaidConfig {
        theme: Some("default".to_string()),
        curve: Some("basis".to_string()),
    });

    let schema = if request.db_type == "sql" {
        let sql = request.sql.as_ref().ok_or("SQL code is required")?;
        parse_sql_to_schema(sql, "postgres")?
    } else {
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
fn parse_sql(sql: String, dialect: String) -> Result<Schema, String> {
    parse_sql_to_schema(&sql, &dialect)
}

// Tauri Commands - Database Connection
#[tauri::command]
async fn test_connection(db_type: String, connection_string: String) -> Result<String, String> {
    match db_type.as_str() {
        "postgres" => test_postgres_connection(&connection_string).await,
        "mysql" | "mariadb" => test_mysql_connection(&connection_string).await,
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}

#[tauri::command]
async fn test_connection_params(params: ConnectionParams) -> Result<String, String> {
    let connection_string = build_connection_string(&params);
    match params.db_type.as_str() {
        "postgresql" | "postgres" => test_postgres_connection(&connection_string).await,
        "mysql" | "mariadb" => test_mysql_connection(&connection_string).await,
        _ => Err(format!("Unsupported database type: {}", params.db_type)),
    }
}

#[tauri::command]
async fn get_databases(params: ConnectionParams) -> Result<Vec<DatabaseInfo>, String> {
    let connection_string = build_connection_string(&params);
    match params.db_type.as_str() {
        "postgresql" | "postgres" => get_postgres_databases(&connection_string).await,
        "mysql" | "mariadb" => {
            let db_name = params.database.as_deref().unwrap_or("");
            get_mysql_databases(&connection_string, db_name).await
        }
        _ => Err(format!("Unsupported database type: {}", params.db_type)),
    }
}

#[tauri::command]
async fn execute_query(params: ConnectionParams, query: String) -> Result<QueryResult, String> {
    let connection_string = build_connection_string(&params);
    match params.db_type.as_str() {
        "postgresql" | "postgres" => execute_postgres_query(&connection_string, &query).await,
        "mysql" | "mariadb" => execute_mysql_query(&connection_string, &query).await,
        _ => Err(format!("Unsupported database type: {}", params.db_type)),
    }
}

// Tauri Commands - File Operations
#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    files::save_file(path, content).await
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    files::read_file(path).await
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    files::create_directory(path).await
}

#[tauri::command]
async fn delete_path(path: String) -> Result<(), String> {
    files::delete_path(path).await
}

#[tauri::command]
async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    files::rename_path(old_path, new_path).await
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    files::list_directory(path).await
}

#[tauri::command]
async fn get_default_project_path() -> Result<String, String> {
    files::get_default_project_path().await
}

#[tauri::command]
async fn get_next_project_folder(base_path: String) -> Result<String, String> {
    files::get_next_project_folder(base_path).await
}

#[tauri::command]
async fn path_exists(path: String) -> bool {
    files::path_exists(path).await
}

#[tauri::command]
async fn export_mermaid_diagram(
    mermaid_code: String,
    output_path: String,
    background: Option<String>,
    theme: Option<String>,
) -> Result<(), String> {
    use std::process::Command;
    use std::fs;
    use std::env;
    
    // Create a temporary file for the mermaid code
    let temp_dir = env::temp_dir();
    let input_path = temp_dir.join("mermaid_temp.mmd");
    
    fs::write(&input_path, &mermaid_code)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    
    // Build the mmdc command
    let mut cmd = Command::new("npx");
    cmd.arg("mmdc");
    cmd.arg("-i").arg(&input_path);
    cmd.arg("-o").arg(&output_path);
    
    // Add background color if specified
    if let Some(bg) = background {
        cmd.arg("-b").arg(bg);
    }
    
    // Add theme if specified
    if let Some(t) = theme {
        cmd.arg("-t").arg(t);
    }
    
    // Run the command
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute mmdc: {}", e))?;
    
    // Clean up temp file
    let _ = fs::remove_file(&input_path);
    
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("mmdc failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            generate_diagram,
            test_connection,
            test_connection_params,
            get_databases,
            execute_query,
            parse_sql,
            save_file,
            read_file,
            create_directory,
            delete_path,
            rename_path,
            list_directory,
            get_default_project_path,
            get_next_project_folder,
            path_exists,
            export_mermaid_diagram
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
