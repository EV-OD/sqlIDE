use crate::types::FileEntry;

pub async fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("Failed to save file: {}", e))
}

pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

pub async fn create_directory(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

pub async fn delete_path(path: String) -> Result<(), String> {
    let path_ref = std::path::Path::new(&path);
    if path_ref.is_dir() {
        std::fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

pub async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))
}

pub async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let is_dir = path.is_dir();
        
        entries.push(FileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: is_dir,
        });
    }
    
    Ok(entries)
}

pub async fn get_default_project_path() -> Result<String, String> {
    let home = dirs::document_dir()
        .or_else(|| dirs::home_dir())
        .ok_or("Could not find home directory")?;
    
    let base_path = home.join("ERMaker");
    Ok(base_path.to_string_lossy().to_string())
}

pub async fn get_next_project_folder(base_path: String) -> Result<String, String> {
    let base = std::path::Path::new(&base_path);
    
    // Ensure base ERMaker directory exists
    if !base.exists() {
        std::fs::create_dir_all(&base).map_err(|e| format!("Failed to create base directory: {}", e))?;
    }
    
    // Find the next available project number
    let mut counter = 1;
    loop {
        let project_name = format!("Project{}", counter);
        let project_path = base.join(&project_name);
        
        if !project_path.exists() {
            // Create the directory
            std::fs::create_dir_all(&project_path).map_err(|e| format!("Failed to create project directory: {}", e))?;
            return Ok(project_path.to_string_lossy().to_string());
        }
        
        counter += 1;
        
        // Safety limit
        if counter > 1000 {
            return Err("Too many projects".to_string());
        }
    }
}

pub async fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}
