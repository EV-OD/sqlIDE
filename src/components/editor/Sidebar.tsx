import { Database, FolderOpen } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import DatabaseExplorer from "./DatabaseExplorer";
import ProjectManager from "./ProjectManager";
import clsx from "clsx";

export default function Sidebar() {
  const { activeSidebarTab, setActiveSidebarTab } = useAppStore();

  const tabs = [
    { id: "database" as const, label: "Database", icon: Database },
    { id: "project" as const, label: "Projects", icon: FolderOpen },
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Tab Buttons */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSidebarTab(tab.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
              activeSidebarTab === tab.id
                ? "text-white bg-zinc-800 border-b-2 border-blue-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSidebarTab === "database" ? (
          <DatabaseExplorer />
        ) : (
          <ProjectManager />
        )}
      </div>
    </div>
  );
}
