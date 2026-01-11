import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw, Layers, Spline } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/useAppStore";
import MermaidDiagram from "../MermaidDiagram";
import type { GenerateRequest, EditorTab, SavedConnection, Schema } from "../../types";

interface EmbeddedErDiagramProps {
  tab: EditorTab;
}

export default function EmbeddedErDiagram({ tab }: EmbeddedErDiagramProps) {
  const { connections, diagramSettings, updateEditorTab } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string>(tab.content || "");
  const [schema, setSchema] = useState<Schema | undefined>(tab.schema);
  const [error, setError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);

  // Find the connection for this diagram
  const connection = connections.find((c) => c.id === tab.connectionId);

  // Use tab's settings if available, otherwise use global settings
  const style = tab.diagramStyle || diagramSettings.style;
  const theme = tab.diagramTheme || diagramSettings.theme;
  const curve = tab.diagramCurve || diagramSettings.curve;
  const background = tab.diagramBackground || diagramSettings.background;

  const buildConnectionString = (conn: SavedConnection, dbName?: string): string => {
    // Use the database name from the tab if available, otherwise from the connection
    const database = dbName || conn.database || "";
    
    if (conn.connectionMode === "string" && conn.connectionString) {
      // If using connection string mode, we need to replace or append the database
      if (dbName) {
        try {
          const url = new URL(conn.connectionString);
          url.pathname = "/" + dbName;
          return url.toString();
        } catch {
          return conn.connectionString;
        }
      }
      return conn.connectionString;
    }

    const { user, password, host, port, dbType } = conn;
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
      const connectionString = buildConnectionString(connection, tab.databaseName);

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

      const result = await invoke<{ mermaidCode: string; schema: Schema }>("generate_diagram", {
        request: payload,
      });

      setMermaidCode(result.mermaidCode);
      setSchema(result.schema);
      // Save the generated code to the tab
      updateEditorTab(tab.id, { content: result.mermaidCode, schema: result.schema, isDirty: false });
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const regenerateFromSchema = async (newSchema: Schema) => {
    setLoading(true);
    try {
      const newCode = await invoke<string>("generate_mermaid", {
        schema: newSchema,
        style,
        config: { theme, curve },
      });
      setMermaidCode(newCode);
      setSchema(newSchema);
      updateEditorTab(tab.id, { content: newCode, schema: newSchema, isDirty: true });
    } catch (err: any) {
      console.error(err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttribute = async (updates: { isDerived?: boolean; isMultivalued?: boolean }) => {
    if (!schema || !contextMenu) return;
    
    // Helper to match ID
    const sanitizeId = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, "");
    
    // Clone schema
    const newSchema = JSON.parse(JSON.stringify(schema)) as Schema;
    
    let found = false;
    for (const table of newSchema.tables) {
        for (const col of table.columns) {
            const id = `A_${sanitizeId(table.name)}_${sanitizeId(col.name)}`;
            
            // Check matches
            if (id === contextMenu.id) {
                if (updates.isDerived !== undefined) col.isDerived = updates.isDerived;
                if (updates.isMultivalued !== undefined) col.isMultivalued = updates.isMultivalued;
                found = true;
                break;
            }
        }
        if (found) break;
    }
    
    if (found) {
        setContextMenu(null);
        await regenerateFromSchema(newSchema);
        // Also save to file if tab has file path?
        if (tab.filePath) {
             await invoke("save_project_file", { filePath: tab.filePath, schema: newSchema });
        }
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
    if (connection && mermaidCode && schema) {
      regenerateFromSchema(schema);
    } else if (connection && mermaidCode) {
      generateDiagram();
    }
  }, [style, theme, curve]);

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const getSelectedColumn = () => {
    if (!contextMenu || !schema) return null;
    // Rust sanitize_id: name.chars().filter(|c| c.is_alphanumeric() || *c == '_').collect()
    // It filters OUT non-alphanumeric chars (except underscore).
    const sanitizeId = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, "");
    
    // console.log("Searching for ID:", contextMenu.id);

    // Try finding exact match first
    for (const table of schema.tables) {
        for (const col of table.columns) {
            const id = `A_${sanitizeId(table.name)}_${sanitizeId(col.name)}`;
            if (id === contextMenu.id) return col;
        }
    }
    
    // Fallback: Try match based on endsWith if mermaid added prefixes
    for (const table of schema.tables) {
        for (const col of table.columns) {
            const id = `A_${sanitizeId(table.name)}_${sanitizeId(col.name)}`;
            if (contextMenu.id.endsWith(id) || contextMenu.id.includes(id)) return col;
        }
    }

    return null;
  };

  const selectedCol = getSelectedColumn();
  
  // Debug effect
  // useEffect(() => {
  //   if (contextMenu) console.log("Context menu open", contextMenu, "Selected Col:", selectedCol);
  // }, [contextMenu, selectedCol]);

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
          <div className="h-full rounded-lg overflow-hidden relative">
            <MermaidDiagram 
                code={mermaidCode} 
                background={background as "light" | "dark" | "transparent"} 
                onNodeContextMenu={(e, id) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, id });
                }}
            />
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

      {/* Context Menu */}
      {contextMenu && (
        <div 
            className="fixed bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 py-1 w-56"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
        >
            {selectedCol ? (
                <>
                <div className="px-3 py-2 border-b border-zinc-700 mb-1">
                    <span className="text-sm font-medium text-white block truncate">{selectedCol.name}</span>
                    <span className="text-xs text-zinc-500 block truncate">{selectedCol.type}</span>
                </div>
                <button 
                    onClick={() => handleUpdateAttribute({ isDerived: !selectedCol.isDerived })}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedCol.isDerived ? "bg-purple-600 border-purple-600" : "border-zinc-500"}`}>
                        {selectedCol.isDerived && <Layers className="w-3 h-3 text-white" />}
                    </div>
                    Is Derived (Dashed)
                </button>
                <button 
                    onClick={() => handleUpdateAttribute({ isMultivalued: !selectedCol.isMultivalued })}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedCol.isMultivalued ? "bg-purple-600 border-purple-600" : "border-zinc-500"}`}>
                        {selectedCol.isMultivalued && <Spline className="w-3 h-3 text-white" />}
                    </div>
                    Is Multivalued (Double)
                </button>
                </>
            ) : (
                <div className="px-3 py-2 text-sm text-zinc-400">
                    No attribute selected ({contextMenu.id})
                </div>
            )}
        </div>
      )}
    </div>
  );
}
