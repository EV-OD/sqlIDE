mod types;
mod database;
mod mermaid;
mod files;

use types::*;
use database::*;
use mermaid::generate_mermaid_code;
use std::path::PathBuf;
use std::net::TcpStream;
use std::{thread, time::Duration};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::fs;
use std::io::{Read, Write};
use tauri::path::BaseDirectory;
use tauri::AppHandle;
use tauri::Manager;

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

fn ensure_support_binaries(bin_dir: &PathBuf) -> Result<(), String> {
    let my_print = bin_dir.join("my_print_defaults");
    if !my_print.exists() {
        // attempt to copy from common system locations as a fallback
        let candidates = [
            "/usr/bin/my_print_defaults",
            "/usr/local/bin/my_print_defaults",
        ];
        for cand in candidates {
            let p = PathBuf::from(cand);
            if p.exists() {
                fs::copy(&p, &my_print).map_err(|e| e.to_string())?;
                #[cfg(unix)]
                {
                    fs::set_permissions(&my_print, fs::Permissions::from_mode(0o755))
                        .map_err(|e| e.to_string())?;
                }
                break;
            }
        }
    }
    if !my_print.exists() {
        return Err(format!("my_print_defaults not found at {}", my_print.display()));
    }
    Ok(())
}

fn ensure_sbin_server(mariadb_dir: &PathBuf, bin_dir: &PathBuf) -> Result<(), String> {
    // some mariadb-install-db scripts expect mariadbd in sbin relative to basedir
    let sbin_dir = mariadb_dir.join("sbin");
    fs::create_dir_all(&sbin_dir).map_err(|e| e.to_string())?;

    let server_bin = if cfg!(windows) {
        bin_dir.join("mariadbd.exe")
    } else {
        bin_dir.join("mariadbd")
    };

    if !server_bin.exists() {
        return Err(format!("mariadbd binary not found at {}", server_bin.display()));
    }

    let sbin_target = if cfg!(windows) {
        sbin_dir.join("mariadbd.exe")
    } else {
        sbin_dir.join("mariadbd")
    };

    if !sbin_target.exists() {
        fs::copy(&server_bin, &sbin_target).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn port_is_listening(port: u16) -> bool {
    TcpStream::connect(("127.0.0.1", port)).is_ok()
}

fn wait_for_port(port: u16, attempts: u32, delay_ms: u64) -> Result<(), String> {
    for _ in 0..attempts {
        if port_is_listening(port) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(delay_ms));
    }
    Err(format!("server did not become ready on port {}", port))
}

fn platform_folder_name() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    format!("{}-{}", os, arch)
}

fn get_mariadb_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_local_dir()
        .ok_or("failed to get local data directory")?
        .join("er-maker");
    Ok(data_dir.join("mariadb"))
}

fn get_pid_file() -> Result<PathBuf, String> {
    Ok(get_mariadb_dir()?.join("mariadb.pid"))
}

fn read_pid_from_file() -> Option<u32> {
    let path = get_pid_file().ok()?;
    let mut file = fs::File::open(&path).ok()?;
    let mut content = String::new();
    file.read_to_string(&mut content).ok()?;
    content.trim().parse::<u32>().ok()
}

fn write_pid_to_file(pid: u32) -> Result<(), String> {
    let path = get_pid_file()?;
    let mut file = fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(pid.to_string().as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

fn remove_pid_file() -> Result<(), String> {
    let path = get_pid_file()?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(unix)]
fn is_process_running(pid: u32) -> bool {
    use std::process::Command;
    Command::new("kill")
        .arg("-0")
        .arg(pid.to_string())
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_process_running(pid: u32) -> bool {
    use std::process::Command;
    Command::new("tasklist")
        .arg("/FI")
        .arg(format!("PID eq {}", pid))
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout).contains(&pid.to_string())
        })
        .unwrap_or(false)
}

#[cfg(unix)]
fn kill_process(pid: u32) -> Result<(), String> {
    use std::process::Command;
    Command::new("kill")
        .arg(pid.to_string())
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(windows)]
fn kill_process(pid: u32) -> Result<(), String> {
    use std::process::Command;
    Command::new("taskkill")
        .arg("/PID")
        .arg(pid.to_string())
        .arg("/F")
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn mariadb_bundle_exists(handle: AppHandle) -> Result<bool, String> {
    let platform = platform_folder_name();
    let src = handle
        .path()
        .resolve(&format!("bundled/mariadb/{}", platform), BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    Ok(src.exists())
}

#[tauri::command]
fn mariadb_install(handle: AppHandle) -> Result<String, String> {
    // Look for bundled resources: $RESOURCE/bundled/mariadb/<platform>
    let platform = platform_folder_name();
    let src = handle
        .path()
        .resolve(&format!("bundled/mariadb/{}", platform), BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    if !src.exists() {
        return Err(format!("bundled mariadb not found: {}", src.display()));
    }

    let data_dir = dirs::data_local_dir()
        .ok_or("failed to get local data directory")?
        .join("er-maker");
    let dest = data_dir.join("mariadb");
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    recursive_copy(&src, &dest)?;

    // ensure helper binaries exist in installed copy
    ensure_support_binaries(&dest.join("bin"))?;
    ensure_sbin_server(&dest, &dest.join("bin"))?;

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

    ensure_support_binaries(&bin_dir)?;
    ensure_sbin_server(&mariadb_dir, &bin_dir)?;

    let p = port.unwrap_or(3307);

    {
        // if we already have a tracked child still running, avoid double-start
        let mut guard = DB_CHILD.lock().map_err(|e| e.to_string())?;
        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(None) => return Ok(format!("mariadb already running on port {}", p)),
                Ok(Some(_)) => *guard = None,
                Err(e) => return Err(e.to_string()),
            }
        }
    }

    // if something else already listens on the target port, treat as running to avoid clashes
    if port_is_listening(p) {
        return Ok(format!("port {} already in use; assuming MariaDB is running", p));
    }

    let datadir = mariadb_dir.join("data");
    // clean partial data dir if it exists but is not initialized
    if datadir.exists() && !datadir.join("mysql").exists() {
        fs::remove_dir_all(&datadir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&datadir).map_err(|e| e.to_string())?;

    // initialize if needed
    if !datadir.join("mysql").exists() {
        let installer = bin_dir.join("mariadb-install-db");
        if !installer.exists() {
            return Err(format!("mariadb-install-db not found at {}", installer.display()));
        }

        let mut cmd = Command::new(&installer);
        let current_user = whoami::username();
        cmd.current_dir(&mariadb_dir)
            .arg("--no-defaults")
            .arg(format!("--basedir={}", mariadb_dir.display()))
            .arg(format!("--datadir={}", datadir.display()))
            .arg(format!("--user={}", current_user))
            .arg("--auth-root-authentication-method=normal")
            .arg("--skip-test-db")
            .arg("--force")
            .env(
                "PATH",
                format!("{}:{}", bin_dir.display(), std::env::var("PATH").unwrap_or_default()),
            )
            .env("HOSTNAME", "localhost");
        let init_status = cmd.output().map_err(|e| e.to_string())?;
        if !init_status.status.success() {
            return Err(format!(
                "mariadb initialize failed: status {:?}\nstdout: {}\nstderr: {}",
                init_status.status.code(),
                String::from_utf8_lossy(&init_status.stdout),
                String::from_utf8_lossy(&init_status.stderr)
            ));
        }
    }

    // write my.cnf in mariadb_dir with app-local paths to avoid clashing with system mysql socket/pid
    let mycnf = mariadb_dir.join("my.cnf");
    let socket_path = mariadb_dir.join("mariadb.sock");
    let pid_path = mariadb_dir.join("mariadb.pid");
    let log_path = mariadb_dir.join("mariadb.log");
    let mycnf_contents = format!(
        "[mysqld]\n\
datadir={}\n\
port={}\n\
bind-address=127.0.0.1\n\
socket={}\n\
pid-file={}\n\
log-error={}\n\
skip-networking=0\n\
skip-name-resolve\n",
        datadir.display(),
        p,
        socket_path.display(),
        pid_path.display(),
        log_path.display()
    );
    fs::write(&mycnf, mycnf_contents).map_err(|e| e.to_string())?;

    // spawn server
    let mut child = Command::new(&mariadbd)
        .arg(format!("--defaults-file={}", mycnf.display()))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    let pid = child.id();
    write_pid_to_file(pid)?;

    *DB_CHILD.lock().map_err(|e| e.to_string())? = Some(child);

    // wait for server to be ready before returning
    wait_for_port(p, 50, 200).map_err(|e| {
        // attempt to clean up child if it failed to start
        if let Ok(mut guard) = DB_CHILD.lock() {
            if let Some(mut ch) = guard.take() {
                let _ = ch.kill();
            }
        }
        let _ = remove_pid_file();
        e
    })?;

    Ok(format!("started mariadb on port {}", p))
}

#[tauri::command]
fn mariadb_stop() -> Result<String, String> {
    // First, try to stop via PID file (our own managed server)
    if let Some(pid) = read_pid_from_file() {
        if is_process_running(pid) {
            kill_process(pid)?;
            remove_pid_file()?;
            
            // Clear tracked child
            if let Ok(mut guard) = DB_CHILD.lock() {
                *guard = None;
            }
            
            return Ok("stopped".into());
        } else {
            // PID file exists but process not running - clean up stale file
            let _ = remove_pid_file();
        }
    }
    
    // Fallback: try to stop tracked child process
    let mut guard = DB_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        let _ = remove_pid_file();
        Ok("stopped".into())
    } else {
        Err("not running".into())
    }
}

#[tauri::command]
fn mariadb_status() -> Result<String, String> {
    // First check PID file (our managed server)
    if let Some(pid) = read_pid_from_file() {
        if is_process_running(pid) {
            return Ok("running".into());
        } else {
            // Stale PID file - clean up
            let _ = remove_pid_file();
        }
    }
    
    // Fallback: check tracked child process
    let mut guard = DB_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(Some(status)) => {
                *guard = None;
                Ok(format!("exited: {}", status))
            },
            Ok(None) => Ok("running".into()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Ok("stopped".into())
    }
}
