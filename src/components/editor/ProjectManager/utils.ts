import type { ProjectFile } from "../../../types";

/**
 * Find parent path recursively - returns full path to the file with given ID
 */
export function findParentPath(
  parentId: string | undefined,
  files: ProjectFile[],
  basePath: string
): string {
  if (!parentId) return basePath;

  for (const file of files) {
    if (file.id === parentId) {
      return `${basePath}/${file.name}`;
    }
    if (file.children && file.children.length > 0) {
      const found = findParentPath(parentId, file.children, `${basePath}/${file.name}`);
      // If found in children, return it (will contain the full nested path)
      if (found !== `${basePath}/${file.name}`) return found;
    }
  }
  return basePath;
}

/**
 * Find file by ID recursively in the file tree
 */
export function findFileById(files: ProjectFile[], id: string): ProjectFile | null {
  for (const f of files) {
    if (f.id === id) return f;
    if (f.children) {
      const found = findFileById(f.children, id);
      if (found) return found;
    }
  }
  return null;
}
