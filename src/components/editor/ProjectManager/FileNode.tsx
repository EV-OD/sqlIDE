import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Check,
  X,
} from "lucide-react";
import { useAppStore } from "../../../store/useAppStore";
import { NewItemInput } from "./NewItemInput";
import type { FileNodeProps } from "./types";

export function FileNode({
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
            <NewItemInput
              isCreating={isCreating}
              level={level + 1}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              onCreateItem={onCreateItem}
              onCancelCreate={onCancelCreate}
            />
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
