import type { ProjectFile } from "../../../types";

export interface ContextMenuState {
  x: number;
  y: number;
  file: ProjectFile | null;
  parentId: string | null;
}

export interface CreatingState {
  type: "file" | "folder";
  parentId: string | null;
}

export interface RenameState {
  id: string | null;
  value: string;
}

export interface FileNodeProps {
  file: ProjectFile;
  level: number;
  projectPath: string;
  onFileClick: (file: ProjectFile) => void;
  onContextMenu: (e: React.MouseEvent, file: ProjectFile) => void;
  isCreating: CreatingState | null;
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

export interface ContextMenuProps {
  x: number;
  y: number;
  file: ProjectFile | null;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}
