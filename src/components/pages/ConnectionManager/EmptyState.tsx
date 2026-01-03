import { Server, Plus } from "lucide-react";

interface EmptyStateProps {
  onNewConnection: () => void;
}

export function EmptyState({ onNewConnection }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
        <Server className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No connections yet</h3>
      <p className="text-zinc-500 mb-6">
        Create your first database connection to get started
      </p>
      <button
        onClick={onNewConnection}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Connection
      </button>
    </div>
  );
}
