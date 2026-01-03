import { FilePlus, FolderPlus, Edit2, Trash2 } from "lucide-react";
import type { ContextMenuProps } from "./types";

export function ContextMenu({
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
