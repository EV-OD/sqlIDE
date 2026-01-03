import { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  FilePlus,
  FolderPlus,
  Check,
  X,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import {
  saveFile,
  createDirectory,
  deletePath,
  getDefaultProjectPath,
  getNextProjectFolder,
  renamePath,
} from "../../services/files";
import type { ProjectFile } from "../../types";

interface ContextMenuProps {
  x: number;
  y: number;
  file: ProjectFile | null;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function ContextMenu({
  x,
  y,
  file,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: ContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        {(!file || file.type === "folder") && (
          <>
            <button
              onClick={onNewFile}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              <FilePlus className="w-4 h-4" />
              New SQL File
            </button>
            <button
              onClick={onNewFolder}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </>
        )}
        {file && (
          <>
            <div className="border-t border-zinc-700 my-1" />
            <button
              onClick={onRename}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              <Edit2 className="w-4 h-4" />
              Rename
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>
    </>
  );
}

interface FileNodeProps {
  file: ProjectFile;
  level: number;
  projectPath: string;
  onFileClick: (file: ProjectFile) => void;
  onContextMenu: (e: React.MouseEvent, file: ProjectFile) => void;
  isCreating: { type: "file" | "folder"; parentId: string | null } | null;
  newItemName: string;
  setNewItemName: (name: string) => void;
  onCreateItem: () => void;
  onCancelCreate: () => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

function FileNode({
  file,
  level,
  projectPath,
  onFileClick,
  onContextMenu,
  isCreating,
  newItemName,
  setNewItemName,
  onCreateItem,
  onCancelCreate,
  renamingId,
  renameValue,
  setRenameValue,
  onRenameSubmit,
  onRenameCancel,
}: FileNodeProps) {
  const { expandedNodes, toggleNode } = useAppStore();
  const isExpanded = expandedNodes.has(`project-${file.id}`);
  const isRenaming = renamingId === file.id;

  const handleClick = () => {
    if (file.type === "folder") {
      toggleNode(`project-${file.id}`);
    } else {
      onFileClick(file);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-zinc-800 rounded cursor-pointer group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={isRenaming ? undefined : handleClick}
        onContextMenu={(e) => onContextMenu(e, file)}
      >
        {file.type === "folder" ? (
          <span className="w-4 h-4 flex items-center justify-center text-zinc-500">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        {file.type === "folder" ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
        )}
        
        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") onRenameSubmit();
                if (e.key === "Escape") onRenameCancel();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-700 text-sm text-white outline-none px-1 rounded"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameSubmit();
              }}
              className="p-0.5 hover:bg-zinc-600 rounded"
            >
              <Check className="w-3 h-3 text-green-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameCancel();
              }}
              className="p-0.5 hover:bg-zinc-600 rounded"
            >
              <X className="w-3 h-3 text-red-400" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-zinc-300 truncate flex-1">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e, file);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-opacity"
            >
              <MoreVertical className="w-3 h-3 text-zinc-500" />
            </button>
          </>
        )}
      </div>
      
      {/* Nested content for folders */}
      {file.type === "folder" && isExpanded && (
        <div>
          {/* New item input for this folder */}
          {isCreating && isCreating.parentId === file.id && (
            <div
              className="flex items-center gap-1 py-1 px-2 bg-zinc-800 rounded mx-1"
              style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
            >
              <span className="w-4" />
              {isCreating.type === "folder" ? (
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateItem();
                  if (e.key === "Escape") onCancelCreate();
                }}
                onBlur={() => {
                  if (newItemName.trim()) {
                    onCreateItem();
                  } else {
                    onCancelCreate();
                  }
                }}
                placeholder={isCreating.type === "folder" ? "Folder name" : "query.sql"}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-500"
              />
            </div>
          )}
          
          {file.children?.map((child) => (
            <FileNode
              key={child.id}
              file={child}
              level={level + 1}
              projectPath={projectPath}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              isCreating={isCreating}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              onCreateItem={onCreateItem}
              onCancelCreate={onCancelCreate}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectManager() {
  const {
    projectFiles,
    projectPath,
    projectName,
    addProjectFile,
    updateProjectFile,
    deleteProjectFile,
    setProjectPath,
    setProjectName,
    addEditorTab,
    setActiveTab,
    editorTabs,
    toggleNode,
    expandedNodes,
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: ProjectFile | null;
    parentId: string | null;
  } | null>(null);

  const [isCreating, setIsCreating] = useState<{
    type: "file" | "folder";
    parentId: string | null;
  } | null>(null);

  const [newItemName, setNewItemName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Initialize project path on first load
  useEffect(() => {
    const initProjectPath = async () => {
      if (!projectPath) {
        try {
          const basePath = await getDefaultProjectPath();
          const newProjectPath = await getNextProjectFolder(basePath);
          setProjectPath(newProjectPath);
          // Extract project name from path
          const name = newProjectPath.split("/").pop() || newProjectPath.split("\\").pop() || "Project";
          setProjectName(name);
        } catch (error) {
          console.error("Failed to initialize project path:", error);
        }
      }
    };
    initProjectPath();
  }, [projectPath, setProjectPath, setProjectName]);

  // Find parent path recursively - returns full path to the file with given ID
  const findParentPath = useCallback((parentId: string | undefined, files: ProjectFile[], basePath: string): string => {
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
  }, []);

  const handleFileClick = (file: ProjectFile) => {
    if (file.type === "file") {
      // Check if file is already open in a tab
      const existingTab = editorTabs.find(tab => tab.fileId === file.id);
      if (existingTab) {
        // Focus existing tab
        setActiveTab(existingTab.id);
      } else {
        // Open new tab
        addEditorTab({
          name: file.name,
          content: file.content || "",
          fileId: file.id,
          isDirty: false,
        });
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: ProjectFile | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
      parentId: file?.type === "folder" ? file.id : file?.parentId || null,
    });
  };

  const handleNewFile = () => {
    const parentId = contextMenu?.file?.type === "folder" 
      ? contextMenu.file.id 
      : contextMenu?.file?.parentId || null;
    
    // Expand parent folder if creating inside one
    if (parentId && !expandedNodes.has(`project-${parentId}`)) {
      toggleNode(`project-${parentId}`);
    }
    
    setIsCreating({ type: "file", parentId });
    setNewItemName("");
    setContextMenu(null);
  };

  const handleNewFolder = () => {
    const parentId = contextMenu?.file?.type === "folder" 
      ? contextMenu.file.id 
      : contextMenu?.file?.parentId || null;
    
    // Expand parent folder if creating inside one
    if (parentId && !expandedNodes.has(`project-${parentId}`)) {
      toggleNode(`project-${parentId}`);
    }
    
    setIsCreating({ type: "folder", parentId });
    setNewItemName("");
    setContextMenu(null);
  };

  const handleCreateItem = async () => {
    if (!isCreating || !newItemName.trim() || !projectPath) return;

    const name =
      isCreating.type === "file" && !newItemName.endsWith(".sql")
        ? `${newItemName}.sql`
        : newItemName;

    try {
      // Find the parent path
      const parentPath = isCreating.parentId 
        ? findParentPath(isCreating.parentId, projectFiles, projectPath)
        : projectPath;
      
      const fullPath = `${parentPath}/${name}`;

      if (isCreating.type === "folder") {
        await createDirectory(fullPath);
      } else {
        // Ensure parent directory exists
        await createDirectory(parentPath);
        await saveFile(fullPath, "-- New SQL query\n");
      }

      const newFile: Omit<ProjectFile, "id" | "createdAt" | "updatedAt"> = {
        name,
        type: isCreating.type,
        parentId: isCreating.parentId || undefined,
        content: isCreating.type === "file" ? "-- New SQL query\n" : undefined,
        children: isCreating.type === "folder" ? [] : undefined,
      };

      addProjectFile(newFile);
    } catch (error) {
      console.error("Failed to create item:", error);
    }

    setIsCreating(null);
    setNewItemName("");
  };

  const handleRename = () => {
    if (contextMenu?.file) {
      setRenamingId(contextMenu.file.id);
      setRenameValue(contextMenu.file.name);
    }
    setContextMenu(null);
  };

  // Find file by ID recursively
  const findFileById = useCallback((files: ProjectFile[], id: string): ProjectFile | null => {
    for (const f of files) {
      if (f.id === id) return f;
      if (f.children) {
        const found = findFileById(f.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleRenameSubmit = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    const file = findFileById(projectFiles, renamingId);
    if (!file || !projectPath) {
      setRenamingId(null);
      return;
    }

    try {
      // Get old and new paths
      const parentPath = file.parentId 
        ? findParentPath(file.parentId, projectFiles, projectPath)
        : projectPath;
      
      const oldPath = `${parentPath}/${file.name}`;
      
      // Check if it's a file and needs .sql extension
      const newName = file.type === "file" && !renameValue.endsWith(".sql")
        ? `${renameValue}.sql`
        : renameValue;
      const newPath = `${parentPath}/${newName}`;

      // Rename on disk
      await renamePath(oldPath, newPath);

      updateProjectFile(renamingId, { name: newName });
    } catch (error) {
      console.error("Failed to rename:", error);
    }

    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = async () => {
    if (!contextMenu?.file || !projectPath) return;

    try {
      const parentPath = contextMenu.file.parentId 
        ? findParentPath(contextMenu.file.parentId, projectFiles, projectPath)
        : projectPath;
      
      const fullPath = `${parentPath}/${contextMenu.file.name}`;
      await deletePath(fullPath);
      deleteProjectFile(contextMenu.file.id);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    
    setContextMenu(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300 truncate" title={projectPath || undefined}>
            {projectName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsCreating({ type: "file", parentId: null });
              setNewItemName("");
            }}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
            title="New SQL File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsCreating({ type: "folder", parentId: null });
              setNewItemName("");
            }}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div
        className="flex-1 overflow-auto py-2"
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        {/* New Item Input at root level */}
        {isCreating && !isCreating.parentId && (
          <div className="flex items-center gap-1 py-1 px-2 mx-2 bg-zinc-800 rounded">
            <span className="w-4" />
            {isCreating.type === "folder" ? (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <input
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateItem();
                if (e.key === "Escape") setIsCreating(null);
              }}
              onBlur={() => {
                if (newItemName.trim()) {
                  handleCreateItem();
                } else {
                  setIsCreating(null);
                }
              }}
              placeholder={isCreating.type === "folder" ? "Folder name" : "query.sql"}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-500"
            />
          </div>
        )}

        {projectFiles.length === 0 && !isCreating ? (
          <div className="px-4 py-8 text-center">
            <Folder className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No files yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Right-click to create files
            </p>
          </div>
        ) : (
          projectFiles.map((file) => (
            <FileNode
              key={file.id}
              file={file}
              level={0}
              projectPath={projectPath || ""}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              isCreating={isCreating}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              onCreateItem={handleCreateItem}
              onCancelCreate={() => setIsCreating(null)}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={handleRenameCancel}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
