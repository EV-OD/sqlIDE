import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../../../store/useAppStore";
import {
  saveFile,
  createDirectory,
  deletePath,
  getDefaultProjectPath,
  getNextProjectFolder,
  renamePath,
} from "../../../services/files";
import { findParentPath, findFileById } from "./utils";
import type { ProjectFile } from "../../../types";
import type { ContextMenuState, CreatingState } from "./types";

export function useProjectManager() {
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

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isCreating, setIsCreating] = useState<CreatingState | null>(null);
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
          const name =
            newProjectPath.split("/").pop() ||
            newProjectPath.split("\\").pop() ||
            "Project";
          setProjectName(name);
        } catch (error) {
          console.error("Failed to initialize project path:", error);
        }
      }
    };
    initProjectPath();
  }, [projectPath, setProjectPath, setProjectName]);

  const handleFileClick = useCallback(
    (file: ProjectFile) => {
      if (file.type === "file") {
        // Check if file is already open in a tab
        const existingTab = editorTabs.find((tab) => tab.fileId === file.id);
        if (existingTab) {
          // Focus existing tab
          setActiveTab(existingTab.id);
        } else {
          // Open new tab
          addEditorTab({
            name: file.name,
            type: "sql",
            content: file.content || "",
            fileId: file.id,
            isDirty: false,
          });
        }
      }
    },
    [editorTabs, setActiveTab, addEditorTab]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: ProjectFile | null) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        file,
        parentId: file?.type === "folder" ? file.id : file?.parentId || null,
      });
    },
    []
  );

  const handleNewFile = useCallback(() => {
    const parentId =
      contextMenu?.file?.type === "folder"
        ? contextMenu.file.id
        : contextMenu?.file?.parentId || null;

    // Expand parent folder if creating inside one
    if (parentId && !expandedNodes.has(`project-${parentId}`)) {
      toggleNode(`project-${parentId}`);
    }

    setIsCreating({ type: "file", parentId });
    setNewItemName("");
    setContextMenu(null);
  }, [contextMenu, expandedNodes, toggleNode]);

  const handleNewFolder = useCallback(() => {
    const parentId =
      contextMenu?.file?.type === "folder"
        ? contextMenu.file.id
        : contextMenu?.file?.parentId || null;

    // Expand parent folder if creating inside one
    if (parentId && !expandedNodes.has(`project-${parentId}`)) {
      toggleNode(`project-${parentId}`);
    }

    setIsCreating({ type: "folder", parentId });
    setNewItemName("");
    setContextMenu(null);
  }, [contextMenu, expandedNodes, toggleNode]);

  const handleCreateItem = useCallback(async () => {
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
  }, [isCreating, newItemName, projectPath, projectFiles, addProjectFile]);

  const handleRename = useCallback(() => {
    if (contextMenu?.file) {
      setRenamingId(contextMenu.file.id);
      setRenameValue(contextMenu.file.name);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleRenameSubmit = useCallback(async () => {
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
      const newName =
        file.type === "file" && !renameValue.endsWith(".sql")
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
  }, [renamingId, renameValue, projectFiles, projectPath, updateProjectFile]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const handleDelete = useCallback(async () => {
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
  }, [contextMenu, projectPath, projectFiles, deleteProjectFile]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(null);
  }, []);

  const startNewFile = useCallback(() => {
    setIsCreating({ type: "file", parentId: null });
    setNewItemName("");
  }, []);

  const startNewFolder = useCallback(() => {
    setIsCreating({ type: "folder", parentId: null });
    setNewItemName("");
  }, []);

  return {
    // State
    projectFiles,
    projectPath,
    projectName,
    contextMenu,
    isCreating,
    newItemName,
    renamingId,
    renameValue,

    // Setters
    setNewItemName,
    setRenameValue,

    // Handlers
    handleFileClick,
    handleContextMenu,
    handleNewFile,
    handleNewFolder,
    handleCreateItem,
    handleRename,
    handleRenameSubmit,
    handleRenameCancel,
    handleDelete,
    handleCloseContextMenu,
    handleCancelCreate,
    startNewFile,
    startNewFolder,
  };
}
