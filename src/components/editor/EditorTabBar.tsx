import { X, FileText, GitBranch } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import clsx from "clsx";

export default function EditorTabBar() {
  const { editorTabs, activeTabId, setActiveTab, closeEditorTab, setActiveSidebarTab } = useAppStore();

  if (editorTabs.length === 0) {
    return null;
  }

  const handleTabClick = (tabId: string, tabType: "sql" | "diagram") => {
    setActiveTab(tabId);
    // Switch sidebar tab based on editor tab type
    if (tabType === "diagram") {
      setActiveSidebarTab("diagram");
    }
  };

  return (
    <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
      {editorTabs.map((tab) => (
        <div
          key={tab.id}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 border-r border-zinc-800 cursor-pointer group min-w-0",
            tab.id === activeTabId
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
          )}
          onClick={() => handleTabClick(tab.id, tab.type || "sql")}
        >
          {tab.type === "diagram" ? (
            <GitBranch className="w-4 h-4 flex-shrink-0 text-purple-400" />
          ) : (
            <FileText className="w-4 h-4 flex-shrink-0 text-blue-400" />
          )}
          <span className="text-sm truncate max-w-[120px]">{tab.name}</span>
          {tab.isDirty && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeEditorTab(tab.id);
            }}
            className="p-0.5 rounded hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
