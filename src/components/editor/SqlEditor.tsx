import { useRef, useCallback } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import { useAppStore } from "../../store/useAppStore";
import { executeQuery } from "../../services/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoEditor = any;

// SQL Keywords for autocomplete
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN",
  "IS", "NULL", "AS", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER",
  "ON", "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE",
  "DROP", "ALTER", "ADD", "COLUMN", "INDEX", "PRIMARY", "KEY", "FOREIGN",
  "REFERENCES", "UNIQUE", "DEFAULT", "CHECK", "CONSTRAINT", "CASCADE",
  "DISTINCT", "ALL", "UNION", "INTERSECT", "EXCEPT", "EXISTS", "CASE",
  "WHEN", "THEN", "ELSE", "END", "COALESCE", "NULLIF", "CAST", "CONVERT",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "FLOOR", "CEIL", "ABS",
  "UPPER", "LOWER", "TRIM", "SUBSTRING", "LENGTH", "CONCAT", "REPLACE",
  "NOW", "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "DATE",
  "TIME", "TIMESTAMP", "INTERVAL", "EXTRACT", "YEAR", "MONTH", "DAY",
  "HOUR", "MINUTE", "SECOND", "WITH", "RECURSIVE", "OVER", "PARTITION",
  "ROW_NUMBER", "RANK", "DENSE_RANK", "LEAD", "LAG", "FIRST_VALUE",
  "LAST_VALUE", "NTILE", "RETURNING", "TRUNCATE", "VACUUM", "ANALYZE",
  "EXPLAIN", "BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "TRANSACTION",
];

const SQL_TYPES = [
  "INTEGER", "INT", "SMALLINT", "BIGINT", "SERIAL", "BIGSERIAL",
  "DECIMAL", "NUMERIC", "REAL", "DOUBLE", "PRECISION", "FLOAT",
  "VARCHAR", "CHAR", "TEXT", "BOOLEAN", "BOOL", "DATE", "TIME",
  "TIMESTAMP", "TIMESTAMPTZ", "INTERVAL", "UUID", "JSON", "JSONB",
  "ARRAY", "BYTEA", "MONEY", "INET", "CIDR", "MACADDR",
];

export default function SqlEditor() {
  const {
    editorTabs,
    activeTabId,
    activeConnection,
    updateEditorTab,
    setQueryResults,
    setIsExecutingQuery,
    databases,
  } = useAppStore();

  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure SQL language features
      monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model: MonacoEditor, position: MonacoEditor) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: {
            label: string;
            kind: number;
            insertText: string;
            range: typeof range;
            detail?: string;
          }[] = [];

          // Add SQL keywords
          SQL_KEYWORDS.forEach((keyword) => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
              detail: "SQL Keyword",
            });
          });

          // Add SQL types
          SQL_TYPES.forEach((type) => {
            suggestions.push({
              label: type,
              kind: monaco.languages.CompletionItemKind.TypeParameter,
              insertText: type,
              range,
              detail: "Data Type",
            });
          });

          // Add table names from database explorer
          databases.forEach((db) => {
            db.tables?.forEach((table) => {
              suggestions.push({
                label: table.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: table.name,
                range,
                detail: `Table in ${db.name}`,
              });

              // Add column names
              table.columns.forEach((column) => {
                suggestions.push({
                  label: `${table.name}.${column.name}`,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: `${table.name}.${column.name}`,
                  range,
                  detail: `${column.type}${column.isPrimaryKey ? " (PK)" : ""}`,
                });

                suggestions.push({
                  label: column.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: column.name,
                  range,
                  detail: `${table.name}.${column.type}`,
                });
              });
            });
          });

          // Add common SQL snippets
          const snippets = [
            {
              label: "SELECT * FROM",
              insertText: "SELECT * FROM ${1:table_name} WHERE ${2:condition};",
              detail: "Select all columns",
            },
            {
              label: "INSERT INTO",
              insertText:
                "INSERT INTO ${1:table_name} (${2:columns})\nVALUES (${3:values});",
              detail: "Insert new row",
            },
            {
              label: "UPDATE SET",
              insertText:
                "UPDATE ${1:table_name}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};",
              detail: "Update rows",
            },
            {
              label: "DELETE FROM",
              insertText: "DELETE FROM ${1:table_name}\nWHERE ${2:condition};",
              detail: "Delete rows",
            },
            {
              label: "CREATE TABLE",
              insertText:
                "CREATE TABLE ${1:table_name} (\n  id SERIAL PRIMARY KEY,\n  ${2:column_name} ${3:data_type}\n);",
              detail: "Create new table",
            },
            {
              label: "JOIN",
              insertText:
                "${1:LEFT} JOIN ${2:table_name} ON ${3:condition}",
              detail: "Join tables",
            },
            {
              label: "GROUP BY",
              insertText: "GROUP BY ${1:column}\nHAVING ${2:condition}",
              detail: "Group results",
            },
            {
              label: "ORDER BY",
              insertText: "ORDER BY ${1:column} ${2:ASC}",
              detail: "Order results",
            },
          ];

          snippets.forEach((snippet) => {
            suggestions.push({
              label: snippet.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippet.insertText,
              // @ts-ignore
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: snippet.detail,
            });
          });

          return { suggestions };
        },
      });

      // Add Ctrl+Enter keybinding for executing query
      editor.addAction({
        id: "execute-query",
        label: "Execute Query",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          handleExecuteQuery();
        },
      });

      // Focus the editor
      editor.focus();
    },
    [databases]
  );

  const handleExecuteQuery = useCallback(async () => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    if (!model) return;

    // Get selected text or entire content
    let query = "";
    if (selection && !selection.isEmpty()) {
      query = model.getValueInRange(selection);
    } else {
      query = model.getValue();
    }

    if (!query.trim()) return;

    // Check if we have an active connection
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
      const result = await executeQuery(activeConnection, query.trim());

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
  }, [activeConnection, setQueryResults, setIsExecutingQuery]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateEditorTab(activeTabId, { content: value, isDirty: true });
      }
    },
    [activeTabId, updateEditorTab]
  );

  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-zinc-500">No file open</p>
          <p className="text-zinc-600 text-sm mt-1">
            Create or open a SQL file from the Project Manager
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900">
      <Editor
        height="100%"
        language="sql"
        theme="vs-dark"
        value={activeTab.content}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineNumbers: "on",
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          snippetSuggestions: "top",
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
