mod types;
mod database;
mod mermaid;
mod files;

use types::*;
use database::*;
use mermaid::generate_mermaid_code;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::fs;

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
            // MariaDB offline manager commands
            mariadb_install,
            mariadb_bundle_exists,
            mariadb_start,
            mariadb_stop,
            mariadb_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

static DB_CHILD: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

fn recursive_copy(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("source path does not exist: {}", src.display()));
    }
    if src.is_file() {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::copy(src, dst).map_err(|e| e.to_string())?;
        return Ok(());
    }
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            recursive_copy(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn platform_folder_name() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    format!("{}-{}", os, arch)
}

#[tauri::command]
fn mariadb_bundle_exists() -> Result<bool, String> {
    let resource_dir = tauri::api::path::resource_dir().ok_or("resource dir not found")?;
    let platform = platform_folder_name();
    let src = resource_dir.join("bundled").join("mariadb").join(&platform);
    Ok(src.exists())
}

#[tauri::command]
fn mariadb_install() -> Result<String, String> {
    // Look for bundled resources: <resource_dir>/bundled/mariadb/<platform>
    let resource_dir = tauri::api::path::resource_dir().ok_or("resource dir not found")?;
    let platform = platform_folder_name();
    let src = resource_dir.join("bundled").join("mariadb").join(&platform);
    if !src.exists() {
        return Err(format!("bundled mariadb not found: {}", src.display()));
    }

    let data_dir = dirs::data_local_dir()
        .ok_or("failed to get local data directory")?
        .join("er-maker");
    let dest = data_dir.join("mariadb");
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    recursive_copy(&src, &dest)?;

    Ok(format!("installed to {}", dest.display()))
}

#[tauri::command]
fn mariadb_start(port: Option<u16>) -> Result<String, String> {
    let data_dir = dirs::data_local_dir()
        .ok_or("failed to get local data directory")?
        .join("er-maker");
    let mariadb_dir = data_dir.join("mariadb");
    if !mariadb_dir.exists() {
        return Err("mariadb not installed; please run install first".into());
    }

    let bin_dir = mariadb_dir.join("bin");
    let mariadbd = if cfg!(windows) { bin_dir.join("mysqld.exe") } else { bin_dir.join("mariadbd") };
    if !mariadbd.exists() {
        return Err(format!("mariadb server binary not found: {}", mariadbd.display()));
    }

    let datadir = mariadb_dir.join("data");
    fs::create_dir_all(&datadir).map_err(|e| e.to_string())?;

    // initialize if needed
    if !datadir.join("mysql").exists() {
        let init_status = Command::new(&mariadbd)
            .arg("--initialize-insecure")
            .arg(format!("--datadir={}", datadir.display()))
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| e.to_string())?;
        if !init_status.status.success() {
            return Err(format!("mariadb initialize failed: {}", String::from_utf8_lossy(&init_status.stderr)));
        }
    }

    // write simple my.cnf in mariadb_dir
    let mycnf = mariadb_dir.join("my.cnf");
    let p = port.unwrap_or(3307);
    let mycnf_contents = format!(
        "[mysqld]\ndatadir={}\nport={}\nbind-address=127.0.0.1\nskip-networking=0\n",
        datadir.display(), p
    );
    fs::write(&mycnf, mycnf_contents).map_err(|e| e.to_string())?;

    // spawn server
    let child = Command::new(&mariadbd)
        .arg(format!("--defaults-file={}", mycnf.display()))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    *DB_CHILD.lock().map_err(|e| e.to_string())? = Some(child);
    Ok(format!("started mariadb on port {}", p))
}

#[tauri::command]
fn mariadb_stop() -> Result<String, String> {
    let mut guard = DB_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        Ok("stopped".into())
    } else {
        Err("not running".into())
    }
}

#[tauri::command]
fn mariadb_status() -> Result<String, String> {
    let guard = DB_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_ref() {
        match child.try_wait() {
            Ok(Some(status)) => Ok(format!("exited: {}", status)),
            Ok(None) => Ok("running".into()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Ok("stopped".into())
    }
}
