import { Folder, FilePlus, FolderPlus } from "lucide-react";

interface ProjectHeaderProps {
  projectName: string;
  projectPath: string | null;
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function ProjectHeader({
  projectName,
  projectPath,
  onNewFile,
  onNewFolder,
}: ProjectHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <Folder className="w-4 h-4 text-zinc-500" />
        <span
          className="text-sm font-medium text-zinc-300 truncate"
          title={projectPath || undefined}
        >
          {projectName}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onNewFile}
          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
          title="New SQL File"
        >
          <FilePlus className="w-4 h-4" />
        </button>
        <button
          onClick={onNewFolder}
          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
