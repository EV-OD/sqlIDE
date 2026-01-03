import { Database, Edit2, Trash2, Check, X } from "lucide-react";
import type { SavedConnection } from "../../../types";

interface ConnectionListProps {
  connections: SavedConnection[];
  deleteConfirmId: string | null;
  onEdit: (connection: SavedConnection) => void;
  onDelete: (id: string) => void;
  onConnect: (connection: SavedConnection) => void;
  onDeleteConfirm: (id: string | null) => void;
}

export function ConnectionList({
  connections,
  deleteConfirmId,
  onEdit,
  onDelete,
  onConnect,
  onDeleteConfirm,
}: ConnectionListProps) {
  return (
    <div className="space-y-3">
      {connections.map((conn) => (
        <div
          key={conn.id}
          className="flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-zinc-600 transition-colors group"
        >
          <div className="w-12 h-12 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{conn.name}</h3>
            <p className="text-zinc-500 text-sm truncate">
              {conn.dbType} • {conn.host || "localhost"}:{conn.port} •{" "}
              {conn.database || "default"}
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {deleteConfirmId === conn.id ? (
              <>
                <button
                  onClick={() => onDelete(conn.id)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  title="Confirm delete"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => onDeleteConfirm(null)}
                  className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(conn)}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteConfirm(conn.id)}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => onConnect(conn)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}
