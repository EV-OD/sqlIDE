import { ArrowLeft, Plus } from "lucide-react";

interface PageHeaderProps {
  onBack: () => void;
  onNewConnection: () => void;
}

export function PageHeader({ onBack, onNewConnection }: PageHeaderProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Connection Manager</h1>
            <p className="text-sm text-zinc-500">Manage your database connections</p>
          </div>
        </div>
        <button
          onClick={onNewConnection}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Connection
        </button>
      </div>
    </div>
  );
}
