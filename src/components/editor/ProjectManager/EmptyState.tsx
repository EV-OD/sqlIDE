import { Folder } from "lucide-react";

export function EmptyState() {
  return (
    <div className="px-4 py-8 text-center">
      <Folder className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
      <p className="text-sm text-zinc-500">No files yet</p>
      <p className="text-xs text-zinc-600 mt-1">Right-click to create files</p>
    </div>
  );
}
