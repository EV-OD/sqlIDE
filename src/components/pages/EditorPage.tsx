import { useEffect, useCallback } from "react";
import { ArrowLeft, Play, Settings, Database, Save, FolderOpen } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { executeQuery } from "../../services/database";
import { openFileDialog, saveFile, createDirectory } from "../../services/files";
import Sidebar from "../editor/Sidebar";
import EditorTabBar from "../editor/EditorTabBar";
import SqlEditor from "../editor/SqlEditor";
import ResultsPanel from "../editor/ResultsPanel";
import EmbeddedErDiagram from "../editor/EmbeddedErDiagram";
import { ResizablePanels } from "../ui/ResizablePanels";

export default function EditorPage() {
  const {
    setCurrentPage,
    activeConnection,
    setIsExecutingQuery,
    setQueryResults,
    editorTabs,
    activeTabId,
    updateEditorTab,
    addEditorTab,
    projectPath,
    projectFiles,
    updateProjectFile,
  } = useAppStore();

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  // Find parent path recursively
  const findParentPath = useCallback((parentId: string | undefined, files: typeof projectFiles, basePath: string): string => {
    if (!parentId) return basePath;
    
    for (const file of files) {
      if (file.id === parentId) {
        return `${basePath}/${file.name}`;
      }
      if (file.children && file.children.length > 0) {
        const childPath = findParentPath(parentId, file.children, `${basePath}/${file.name}`);
        if (childPath !== `${basePath}/${file.name}`) return childPath;
      }
    }
    return basePath;
  }, []);

  // Find file by ID recursively
  const findFileById = useCallback((files: typeof projectFiles, id: string): typeof projectFiles[0] | null => {
    for (const f of files) {
      if (f.id === id) return f;
      if (f.children) {
        const found = findFileById(f.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;

    try {
      // If the tab is linked to a project file, save there
      if (activeTab.fileId && projectPath) {
        const projectFile = findFileById(projectFiles, activeTab.fileId);
        if (projectFile) {
          const parentPath = projectFile.parentId 
            ? findParentPath(projectFile.parentId, projectFiles, projectPath)
            : projectPath;
          
          const filePath = `${parentPath}/${projectFile.name}`;
          
          // Ensure directory exists
          await createDirectory(parentPath);
          await saveFile(filePath, activeTab.content);
          
          // Update project file content
          updateProjectFile(activeTab.fileId, { content: activeTab.content });
          updateEditorTab(activeTab.id, { isDirty: false, filePath });
          return;
        }
      }
      
      // If has a file path already, save directly
      if (activeTab.filePath) {
        await saveFile(activeTab.filePath, activeTab.content);
        updateEditorTab(activeTab.id, { isDirty: false });
        return;
      }

      // If no file path and no project file, save to project root
      if (projectPath) {
        const filePath = `${projectPath}/${activeTab.name}`;
        await createDirectory(projectPath);
        await saveFile(filePath, activeTab.content);
        updateEditorTab(activeTab.id, { 
          filePath, 
          isDirty: false 
        });
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  }, [activeTab, projectPath, projectFiles, updateEditorTab, updateProjectFile, findFileById, findParentPath]);

  const handleOpen = useCallback(async () => {
    try {
      const result = await openFileDialog();
      if (result) {
        const fileName = result.path.split("/").pop() || result.path.split("\\").pop() || "query.sql";
        addEditorTab({
          name: fileName,
          type: "sql",
          content: result.content,
          filePath: result.path,
          isDirty: false,
        });
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  }, [addEditorTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleOpen]);

  const handleExecute = async () => {
    if (!activeTab) return;

    const query = activeTab.content.trim();
    if (!query) return;

    if (!activeConnection) {
      setQueryResults({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: "No database connection. Please connect to a database first.",
      });
      return;
    }

    setIsExecutingQuery(true);

    try {
      const result = await executeQuery(activeConnection, query);

      setQueryResults({
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
      });
    } catch (error) {
      setQueryResults({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecutingQuery(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage("welcome")}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            title="Back to Welcome"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-white">
              {activeConnection?.name || "SQL Editor"}
            </span>
            {activeConnection && (
              <span className="text-xs text-zinc-500">
                ({activeConnection.dbType})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpen}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            title="Open File (Ctrl+O)"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={!activeTab}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save (Ctrl+S)"
          >
            <Save className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-zinc-700" />
          <button
            onClick={handleExecute}
            disabled={!activeTab}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
          <button
            onClick={() => setCurrentPage("connection-manager")}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            title="Connection Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanels direction="horizontal" defaultSize={20} minSize={15} maxSize={40}>
          {/* Sidebar */}
          <Sidebar />

          {/* Editor Area */}
          {activeTab?.type === "diagram" ? (
            /* ER Diagram View */
            <div className="h-full flex flex-col">
              <EditorTabBar />
              <div className="flex-1 overflow-hidden">
                <EmbeddedErDiagram tab={activeTab} />
              </div>
            </div>
          ) : (
            /* SQL Editor View */
            <ResizablePanels direction="vertical" defaultSize={60} minSize={20} maxSize={90}>
              {/* SQL Editor */}
              <div className="h-full flex flex-col">
                <EditorTabBar />
                <div className="flex-1 overflow-hidden">
                  <SqlEditor />
                </div>
              </div>

              {/* Results Panel */}
              <ResultsPanel />
            </ResizablePanels>
          )}
        </ResizablePanels>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span>
            {activeConnection
              ? `Connected to ${activeConnection.host || "localhost"}:${activeConnection.port}`
              : "Not connected"}
          </span>
          {activeTab?.filePath && (
            <span className="text-zinc-600 truncate max-w-md" title={activeTab.filePath}>
              {activeTab.filePath}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>SQL</span>
          <span>UTF-8</span>
          <span>Ctrl+S to save • Ctrl+Enter to execute</span>
        </div>
      </div>
    </div>
  );
}
