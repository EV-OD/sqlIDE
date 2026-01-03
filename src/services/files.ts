import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export async function saveFile(path: string, content: string): Promise<void> {
  return invoke("save_file", { path, content });
}

export async function readFile(path: string): Promise<string> {
  return invoke("read_file", { path });
}

export async function createDirectory(path: string): Promise<void> {
  return invoke("create_directory", { path });
}

export async function deletePath(path: string): Promise<void> {
  return invoke("delete_path", { path });
}

export async function renamePath(oldPath: string, newPath: string): Promise<void> {
  return invoke("rename_path", { oldPath, newPath });
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  return invoke("list_directory", { path });
}

export async function getDefaultProjectPath(): Promise<string> {
  return invoke("get_default_project_path");
}

export async function getNextProjectFolder(basePath: string): Promise<string> {
  return invoke("get_next_project_folder", { basePath });
}

export async function pathExists(path: string): Promise<boolean> {
  return invoke("path_exists", { path });
}

export async function saveFileDialog(
  content: string,
  defaultName?: string
): Promise<string | null> {
  const filePath = await save({
    defaultPath: defaultName,
    filters: [
      { name: "SQL Files", extensions: ["sql"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (filePath) {
    await saveFile(filePath, content);
    return filePath;
  }
  return null;
}

export async function openFileDialog(): Promise<{ path: string; content: string } | null> {
  const filePath = await open({
    filters: [
      { name: "SQL Files", extensions: ["sql"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (filePath) {
    const content = await readFile(filePath as string);
    return { path: filePath as string, content };
  }
  return null;
}
