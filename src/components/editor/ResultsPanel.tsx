import { AlertCircle, CheckCircle, Clock, Table } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export default function ResultsPanel() {
  const { queryResults, isExecutingQuery } = useAppStore();

  if (isExecutingQuery) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Executing query...</span>
        </div>
      </div>
    );
  }

  if (!queryResults) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <Table className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No results yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Ctrl+Enter</kbd> to execute
          </p>
        </div>
      </div>
    );
  }

  if (queryResults.error) {
    return (
      <div className="h-full bg-zinc-900 p-4">
        <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium">Query Error</h3>
            <p className="text-red-300/80 text-sm mt-1 font-mono">
              {queryResults.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Query executed successfully</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>{queryResults.executionTime}ms</span>
          </div>
        </div>
        <div className="text-zinc-500 text-sm">
          {queryResults.rowCount} row{queryResults.rowCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 overflow-auto">
        {queryResults.columns.length === 0 ? (
          <div className="p-4 text-zinc-500 text-sm">No columns returned</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left text-zinc-400 font-medium border-b border-zinc-700 w-12">
                  #
                </th>
                {queryResults.columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-2 text-left text-zinc-400 font-medium border-b border-zinc-700 whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResults.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-zinc-800/50 border-b border-zinc-800/50"
                >
                  <td className="px-4 py-2 text-zinc-600 font-mono text-xs">
                    {rowIndex + 1}
                  </td>
                  {queryResults.columns.map((column) => (
                    <td
                      key={column}
                      className="px-4 py-2 text-zinc-300 whitespace-nowrap font-mono"
                    >
                      {row[column] === null ? (
                        <span className="text-zinc-600 italic">NULL</span>
                      ) : typeof row[column] === "object" ? (
                        <span className="text-blue-400">
                          {JSON.stringify(row[column])}
                        </span>
                      ) : typeof row[column] === "number" ? (
                        <span className="text-purple-400">{String(row[column])}</span>
                      ) : typeof row[column] === "boolean" ? (
                        <span className="text-orange-400">
                          {row[column] ? "true" : "false"}
                        </span>
                      ) : (
                        String(row[column])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
