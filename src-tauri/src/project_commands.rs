use crate::types::Schema;
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_project_file(file_path: &str, schema: Schema) -> Result<(), String> {
    let json_data = serde_json::to_string_pretty(&schema)
        .map_err(|e| format!("Failed to serialize schema: {}", e))?;
    
    // Ensure directory exists
    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(file_path, json_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;
        
    Ok(())
}

#[tauri::command]
pub fn load_project_file(file_path: &str) -> Result<Schema, String> {
    if !Path::new(file_path).exists() {
        return Err("File does not exist".to_string());
    }

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
        
    let schema: Schema = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;
        
    Ok(schema)
}
