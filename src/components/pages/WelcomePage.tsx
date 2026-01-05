import { Database, FolderOpen, Plus, Settings, Zap, GitBranch, Server } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import LocalServerButton from "../LocalServerButton";

export default function WelcomePage() {
  const { setCurrentPage, connections } = useAppStore();

  const features = [
    {
      icon: Database,
      title: "Database Explorer",
      description: "Browse databases, tables, and columns in a tree structure",
    },
    {
      icon: FolderOpen,
      title: "Project Manager",
      description: "Organize your SQL files in nested folders",
    },
    {
      icon: Zap,
      title: "Smart Editor",
      description: "Monaco editor with SQL autocomplete and syntax highlighting",
    },
    {
      icon: GitBranch,
      title: "ER Diagrams",
      description: "Generate beautiful ER diagrams from your database schema",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-8">
      {/* Logo and Title */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/25">
          <Database className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">SqlIde</h1>
        <p className="text-zinc-400 text-lg max-w-md">
          A powerful SQL editor with database exploration and project management
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-16 justify-center">
        <button
          onClick={() => setCurrentPage("connection-manager")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-5 h-5" />
          New Connection
        </button>
        <button
          onClick={() => setCurrentPage("er-generator")}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-600/25"
        >
          <GitBranch className="w-5 h-5" />
          ER Diagram Generator
        </button>
        
        <div className="flex items-center gap-2">
          <LocalServerButton />
          <button
            onClick={() => setCurrentPage("mariadb-manager")}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-700"
            title="Manage Local Database"
          >
            <Server className="w-5 h-5" />
          </button>
        </div>

        {connections.length > 0 && (
          <button
            onClick={() => setCurrentPage("connection-manager")}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
          >
            <Settings className="w-5 h-5" />
            Manage Connections ({connections.length})
          </button>
        )}
      </div>

      <div className="max-w-5xl w-full space-y-8">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 hover:border-zinc-600/50 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-700/50 mb-4">
                <feature.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-zinc-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Connections */}
      {connections.length > 0 && (
        <div className="mt-16 w-full max-w-2xl">
          <h2 className="text-zinc-400 text-sm font-medium mb-4 uppercase tracking-wide">
            Recent Connections
          </h2>
          <div className="space-y-2">
            {connections.slice(0, 5).map((conn) => (
              <button
                key={conn.id}
                onClick={() => {
                  useAppStore.getState().setActiveConnection(conn);
                  setCurrentPage("editor");
                }}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-blue-500/50 hover:bg-zinc-800 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                  <Database className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{conn.name}</p>
                  <p className="text-zinc-500 text-sm truncate">
                    {conn.dbType} • {conn.host || "localhost"}:{conn.port || "5432"}
                  </p>
                </div>
                <div className="text-zinc-500 text-sm">
                  {conn.database || "default"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 text-center text-zinc-500 text-sm">
        Press <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-xs">Ctrl+Enter</kbd> to execute queries
      </div>
    </div>
  );
}
