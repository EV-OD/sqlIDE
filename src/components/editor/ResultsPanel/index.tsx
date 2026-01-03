import { useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { AlertCircle, CheckCircle, Clock, Table } from "lucide-react";
import { useAppStore } from "../../../store/useAppStore";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom dark theme
const darkTheme = themeQuartz.withParams({
  backgroundColor: "#18181b",
  foregroundColor: "#fafafa",
  headerBackgroundColor: "#27272a",
  headerTextColor: "#a1a1aa",
  oddRowBackgroundColor: "#18181b",
  rowHoverColor: "#27272a",
  borderColor: "#3f3f46",
  cellTextColor: "#d4d4d8",
});

export default function ResultsPanel() {
  const { queryResults, isExecutingQuery } = useAppStore();

  // Generate column definitions from query results
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!queryResults?.columns) return [];
    
    return [
      {
        headerName: "#",
        valueGetter: "node.rowIndex + 1",
        width: 60,
        pinned: "left",
        cellClass: "text-zinc-500 font-mono text-xs",
        suppressMovable: true,
      },
      ...queryResults.columns.map((col) => ({
        field: col,
        headerName: col,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        valueFormatter: (params: ValueFormatterParams) => {
          if (params.value === null || params.value === undefined) {
            return "NULL";
          }
          if (typeof params.value === "object") {
            return JSON.stringify(params.value);
          }
          if (typeof params.value === "boolean") {
            return params.value ? "true" : "false";
          }
          return String(params.value);
        },
        cellClass: (params: { value: unknown }) => {
          if (params.value === null || params.value === undefined) {
            return "text-zinc-600 italic";
          }
          if (typeof params.value === "number") {
            return "text-purple-400 font-mono";
          }
          if (typeof params.value === "boolean") {
            return "text-orange-400 font-mono";
          }
          if (typeof params.value === "object") {
            return "text-blue-400 font-mono";
          }
          return "text-zinc-300 font-mono";
        },
      })),
    ];
  }, [queryResults?.columns]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onGridReady = useCallback(() => {
    // Auto-size columns on grid ready
  }, []);

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

      {/* AG Grid Table */}
      <div className="flex-1 overflow-hidden">
        {queryResults.columns.length === 0 ? (
          <div className="p-4 text-zinc-500 text-sm">No columns returned</div>
        ) : (
          <AgGridReact
            theme={darkTheme}
            rowData={queryResults.rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            animateRows={false}
            rowSelection="multiple"
            suppressCellFocus={false}
            enableCellTextSelection={true}
            ensureDomOrder={true}
          />
        )}
      </div>
    </div>
  );
}
