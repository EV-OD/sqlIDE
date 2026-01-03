import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/useAppStore";
import MermaidDiagram from "../MermaidDiagram";
import type { GenerateRequest, EditorTab, SavedConnection } from "../../types";

interface EmbeddedErDiagramProps {
  tab: EditorTab;
}

export default function EmbeddedErDiagram({ tab }: EmbeddedErDiagramProps) {
  const { connections, diagramSettings, updateEditorTab } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string>(tab.content || "");
  const [error, setError] = useState<string | null>(null);

  // Find the connection for this diagram
  const connection = connections.find((c) => c.id === tab.connectionId);

  // Use tab's settings if available, otherwise use global settings
  const style = tab.diagramStyle || diagramSettings.style;
  const theme = tab.diagramTheme || diagramSettings.theme;
  const curve = tab.diagramCurve || diagramSettings.curve;
  const background = tab.diagramBackground || diagramSettings.background;

  const buildConnectionString = (conn: SavedConnection): string => {
    if (conn.connectionMode === "string" && conn.connectionString) {
      return conn.connectionString;
    }

    const { user, password, host, port, database, dbType } = conn;
    if (dbType === "postgresql" || dbType === "sqlite") {
      return `postgresql://${user}:${password}@${host || "localhost"}:${port || "5432"}/${database}`;
    } else if (dbType === "mysql" || dbType === "mariadb") {
      return `mysql://${user}:${password}@${host || "localhost"}:${port || "3306"}/${database}`;
    }
    return "";
  };

  const generateDiagram = async () => {
    if (!connection) {
      setError("Connection not found. Please check your connections.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connectionString = buildConnectionString(connection);

      // Map dbType correctly
      let dbType = connection.dbType;
      if (dbType === "postgresql") dbType = "postgres" as any;

      const payload: GenerateRequest = {
        type: dbType,
        connectionString: connectionString,
        style: style,
        config: {
          theme,
          curve,
        },
      };

      const result = await invoke<{ mermaidCode: string }>("generate_diagram", {
        request: payload,
      });

      setMermaidCode(result.mermaidCode);
      // Save the generated code to the tab
      updateEditorTab(tab.id, { content: result.mermaidCode, isDirty: false });
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // Generate diagram when tab is opened for the first time or settings change
  useEffect(() => {
    if (!mermaidCode && connection) {
      generateDiagram();
    }
  }, [connection?.id]);

  // Regenerate when settings change
  useEffect(() => {
    if (connection && mermaidCode) {
      generateDiagram();
    }
  }, [style, theme, curve]);

  if (!connection) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">Connection not found</p>
        <p className="text-sm mt-2">The connection for this diagram may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="text-zinc-500">Connection:</span>
          <span className="text-white font-medium">{connection.name}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">{connection.dbType}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateDiagram}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded text-sm font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Diagram Area */}
      <div className="flex-1 overflow-hidden p-4">
        {loading && !mermaidCode ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
            <p className="text-lg">Generating ER Diagram...</p>
            <p className="text-sm text-zinc-500 mt-2">Connecting to {connection.name}</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-lg text-red-400 font-medium">Failed to generate diagram</p>
            <p className="text-sm text-zinc-500 mt-2 max-w-md text-center">{error}</p>
            <button
              onClick={generateDiagram}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : mermaidCode ? (
          <div className="h-full rounded-lg overflow-hidden">
            <MermaidDiagram code={mermaidCode} background={background as "light" | "dark" | "transparent"} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <p className="text-lg">No diagram generated yet</p>
            <button
              onClick={generateDiagram}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Generate Diagram
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
