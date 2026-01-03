import { useState, useEffect, useRef } from "react";
import {
  Database,
  Table,
  ChevronRight,
  ChevronDown,
  Key,
  Type,
  RefreshCw,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { getDatabases } from "../../services/database";
import type { DatabaseInfo, DatabaseTable, DatabaseColumn } from "../../types";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenErDiagram: () => void;
}

function ContextMenu({ x, y, onClose, onOpenErDiagram }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-zinc-800 border border-zinc-700 rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => {
          onOpenErDiagram();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        <GitBranch className="w-4 h-4 text-purple-400" />
        Open ER Diagram
      </button>
    </div>
  );
}

interface TreeNodeProps {
  nodeId: string;
  label: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  level?: number;
  isExpandable?: boolean;
  onClick?: () => void;
}

function TreeNode({
  nodeId,
  label,
  icon,
  children,
  level = 0,
  isExpandable = false,
  onClick,
}: TreeNodeProps) {
  const { expandedNodes, toggleNode } = useAppStore();
  const isExpanded = expandedNodes.has(nodeId);

  const handleClick = () => {
    if (isExpandable) {
      toggleNode(nodeId);
    }
    onClick?.();
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-zinc-800 rounded cursor-pointer group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isExpandable ? (
          <span className="w-4 h-4 flex items-center justify-center text-zinc-500">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-sm text-zinc-300 truncate">{label}</span>
      </div>
      {isExpanded && children}
    </div>
  );
}

interface ColumnNodeProps {
  column: DatabaseColumn;
  level: number;
}

function ColumnNode({ column, level }: ColumnNodeProps) {
  return (
    <div
      className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-800 rounded cursor-pointer"
      style={{ paddingLeft: `${level * 12 + 8}px` }}
    >
      <span className="w-4" />
      {column.isPrimaryKey ? (
        <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" />
      ) : column.isForeignKey ? (
        <Key className="w-3 h-3 text-blue-500 flex-shrink-0" />
      ) : (
        <Type className="w-3 h-3 text-zinc-500 flex-shrink-0" />
      )}
      <span className="text-sm text-zinc-400 truncate">{column.name}</span>
      <span className="text-xs text-zinc-600 truncate ml-auto">{column.type}</span>
    </div>
  );
}

interface TableNodeProps {
  table: DatabaseTable;
  dbName: string;
  level: number;
}

function TableNode({ table, dbName, level }: TableNodeProps) {
  const nodeId = `${dbName}.${table.name}`;

  return (
    <TreeNode
      nodeId={nodeId}
      label={table.name}
      icon={<Table className="w-4 h-4 text-green-500" />}
      level={level}
      isExpandable={table.columns.length > 0}
    >
      {table.columns.map((column) => (
        <ColumnNode
          key={`${nodeId}.${column.name}`}
          column={column}
          level={level + 1}
        />
      ))}
    </TreeNode>
  );
}

interface DatabaseNodeProps {
  database: DatabaseInfo;
  level: number;
}

function DatabaseNode({ database, level }: DatabaseNodeProps) {
  const tables = database.tables || [];

  return (
    <TreeNode
      nodeId={database.name}
      label={database.name}
      icon={<Database className="w-4 h-4 text-blue-500" />}
      level={level}
      isExpandable={tables.length > 0}
    >
      {tables.map((table) => (
        <TableNode
          key={`${database.name}.${table.name}`}
          table={table}
          dbName={database.name}
          level={level + 1}
        />
      ))}
    </TreeNode>
  );
}

export default function DatabaseExplorer() {
  const { activeConnection, databases, setDatabases, openErDiagram } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Fetch databases when connection changes
  useEffect(() => {
    if (activeConnection) {
      fetchDatabases();
    }
  }, [activeConnection?.id]);

  const fetchDatabases = async () => {
    if (!activeConnection) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const dbs = await getDatabases(activeConnection);
      setDatabases(dbs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDatabases([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDatabases();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleOpenErDiagram = () => {
    if (activeConnection) {
      openErDiagram(activeConnection);
    }
  };

  return (
    <div className="h-full flex flex-col" onContextMenu={handleContextMenu}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-300 truncate">
            {activeConnection?.name || "Database"}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || !activeConnection}
          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto py-2">
        {!activeConnection ? (
          <div className="px-4 py-8 text-center">
            <Database className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No connection selected</p>
            <p className="text-xs text-zinc-600 mt-1">
              Select a connection to browse
            </p>
          </div>
        ) : isRefreshing ? (
          <div className="px-4 py-8 text-center">
            <RefreshCw className="w-8 h-8 text-zinc-600 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">Connection failed</p>
            <p className="text-xs text-zinc-500 mt-1 px-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-blue-500 hover:text-blue-400"
            >
              Retry
            </button>
          </div>
        ) : databases.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Database className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No tables found</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-blue-500 hover:text-blue-400"
            >
              Refresh
            </button>
          </div>
        ) : (
          databases.map((db) => (
            <DatabaseNode key={db.name} database={db} level={0} />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && activeConnection && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenErDiagram={handleOpenErDiagram}
        />
      )}
    </div>
  );
}
