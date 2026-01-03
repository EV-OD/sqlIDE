import { Folder, FileText } from "lucide-react";
import type { CreatingState } from "./types";

interface NewItemInputProps {
  isCreating: CreatingState;
  level: number;
  newItemName: string;
  setNewItemName: (name: string) => void;
  onCreateItem: () => void;
  onCancelCreate: () => void;
}

export function NewItemInput({
  isCreating,
  level,
  newItemName,
  setNewItemName,
  onCreateItem,
  onCancelCreate,
}: NewItemInputProps) {
  return (
    <div
      className="flex items-center gap-1 py-1 px-2 bg-zinc-800 rounded mx-1"
      style={{ paddingLeft: `${level * 12 + 8}px` }}
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
  );
}
