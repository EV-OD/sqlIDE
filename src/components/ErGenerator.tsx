import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Database, Code, Loader2, Play, Server, Save, Trash2, List, Plug, Link } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import MermaidDiagram from "./MermaidDiagram";
import { Modal } from "./ui/Modal";
import { CustomSelect } from "./ui/CustomSelect";
import { useAppStore } from "../store/useAppStore";
import type { Tab, SavedConnection, DiagramStyle, GenerateRequest } from "../types";

const DB_TYPE_OPTIONS = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
];

const THEME_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "forest", label: "Forest" },
  { value: "dark", label: "Dark" },
  { value: "neutral", label: "Neutral" },
  { value: "base", label: "Base" },
];

const CURVE_OPTIONS = [
  { value: "basis", label: "Curved (Basis)" },
  { value: "linear", label: "Straight (Linear)" },
  { value: "step", label: "Stepped" },
  { value: "monotoneX", label: "Monotone X" },
  { value: "monotoneY", label: "Monotone Y" },
];

const BACKGROUND_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "transparent", label: "Transparent" },
];

type ExtendedTab = Tab | "app-connections";

export default function ErGenerator() {
  const [activeTab, setActiveTab] = useState<ExtendedTab>("database");
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [diagramStyle, setDiagramStyle] = useState<DiagramStyle>("chen");
  const [theme, setTheme] = useState("default");
  const [curve, setCurve] = useState("basis");
  const [background, setBackground] = useState<"light" | "dark" | "transparent">("light");

  // Get connections from app store
  const { connections: appConnections } = useAppStore();

  const { register, handleSubmit, setValue, watch, getValues } = useForm({
    defaultValues: {
      connectionString: "",
      sql: "",
      dbType: "postgres",
      connectionMode: "url",
      host: "localhost",
      port: "5432",
      database: "",
      user: "",
      password: "",
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("sql-ide-connections");
    if (saved) {
      try {
        setSavedConnections(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved connections", e);
      }
    }

    const lastUsed = localStorage.getItem("sql-ide-last-connection");
    if (lastUsed) {
      try {
        const conn = JSON.parse(lastUsed);
        setValue("dbType", conn.dbType || "postgres");
        setValue("connectionMode", conn.connectionMode || "url");
        if (conn.connectionString) setValue("connectionString", conn.connectionString);
        if (conn.host) setValue("host", conn.host);
        if (conn.port) setValue("port", conn.port);
        if (conn.database) setValue("database", conn.database);
        if (conn.user) setValue("user", conn.user);
        if (conn.password) setValue("password", conn.password);
        
        if (conn.style) setDiagramStyle(conn.style);
        if (conn.theme) setTheme(conn.theme);
        if (conn.curve) setCurve(conn.curve);
      } catch (e) {
        console.error("Failed to parse last used connection", e);
      }
    }
  }, [setValue]);

  const openSaveModal = () => {
    setNewConnectionName("");
    setSaveError(null);
    setIsSaveModalOpen(true);
  };

  const handleSaveConnection = () => {
    if (!newConnectionName.trim()) {
      setSaveError("Connection name is required");
      return;
    }

    const values = getValues();
    // Map form values to SavedConnection type
    const dbTypeMap: Record<string, SavedConnection["dbType"]> = {
      postgres: "postgresql",
      mysql: "mysql",
      mariadb: "mariadb",
    };
    const newConnection: SavedConnection = {
      id: Date.now().toString(),
      name: newConnectionName.trim(),
      dbType: dbTypeMap[values.dbType] || "postgresql",
      connectionMode: values.connectionMode === "url" ? "string" : "params",
      connectionString: values.connectionString,
      host: values.host,
      port: values.port,
      database: values.database,
      user: values.user,
      password: values.password,
      style: diagramStyle,
      theme: theme,
      curve: curve,
    };

    let updated = [...savedConnections];
    const existingIndex = updated.findIndex(c => c.name.toLowerCase() === newConnectionName.trim().toLowerCase());

    if (existingIndex >= 0) {
      updated[existingIndex] = { ...newConnection, id: updated[existingIndex].id };
    } else {
      updated.push(newConnection);
    }

    setSavedConnections(updated);
    localStorage.setItem("sql-ide-connections", JSON.stringify(updated));
    setIsSaveModalOpen(false);
    setActiveTab("saved");
  };

  const loadConnection = (id: string) => {
    const conn = savedConnections.find((c) => c.id === id);
    if (!conn) return;

    // Map SavedConnection dbType back to form dbType
    const dbTypeToForm: Record<string, string> = {
      postgresql: "postgres",
      mysql: "mysql",
      mariadb: "mariadb",
    };
    const formDbType = dbTypeToForm[conn.dbType] || "postgres";
    const formConnectionMode = conn.connectionMode === "string" ? "url" : "manual";

    setValue("dbType", formDbType);
    setValue("connectionMode", formConnectionMode);
    if (conn.connectionString) setValue("connectionString", conn.connectionString);
    if (conn.host) setValue("host", conn.host);
    if (conn.port) setValue("port", conn.port);
    if (conn.database) setValue("database", conn.database);
    if (conn.user) setValue("user", conn.user);
    if (conn.password) setValue("password", conn.password);
    
    setDiagramStyle(conn.style || "chen");
    setTheme(conn.theme || "default");
    setCurve(conn.curve || "basis");

    const lastUsed = {
      dbType: formDbType,
      connectionMode: formConnectionMode,
      connectionString: conn.connectionString,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      user: conn.user,
      password: conn.password,
      style: conn.style || "chen",
      theme: conn.theme || "default",
      curve: conn.curve || "basis",
    };
    localStorage.setItem("sql-ide-last-connection", JSON.stringify(lastUsed));

    setActiveTab("database");
  };

  const deleteConnection = (id: string) => {
    const updated = savedConnections.filter((c) => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem("sql-ide-connections", JSON.stringify(updated));
  };

  // Load connection from app store (Connection Manager)
  const loadAppConnection = (conn: SavedConnection) => {
    // Map dbType from app connection format
    let dbType = conn.dbType;
    if (dbType === "postgresql") dbType = "postgres" as any;

    setValue("dbType", dbType);
    setValue("connectionMode", conn.connectionMode === "string" ? "url" : "manual");
    if (conn.connectionString) setValue("connectionString", conn.connectionString);
    if (conn.host) setValue("host", conn.host);
    if (conn.port) setValue("port", conn.port);
    if (conn.database) setValue("database", conn.database);
    if (conn.user) setValue("user", conn.user);
    if (conn.password) setValue("password", conn.password);
    
    setDiagramStyle(conn.style || "chen");
    setTheme(conn.theme || "default");
    setCurve(conn.curve || "basis");

    setActiveTab("database");
  };

  const dbType = watch("dbType");
  const connectionMode = watch("connectionMode");

  // Update default port when dbType changes
  useEffect(() => {
    if (dbType === "postgres") setValue("port", "5432");
    if (dbType === "mysql" || dbType === "mariadb") setValue("port", "3306");
  }, [dbType, setValue]);

  const getPlaceholder = () => {
    if (dbType === "postgres") return "postgresql://user:password@localhost:5432/mydb";
    if (dbType === "mysql" || dbType === "mariadb") return "mysql://user:password@localhost:3306/mydb";
    return "";
  };

  const buildConnectionString = (data: any): string => {
    if (data.connectionMode === "url") {
      return data.connectionString;
    }
    
    const { user, password, host, port, database } = data;
    if (data.dbType === "postgres") {
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    } else if (data.dbType === "mysql" || data.dbType === "mariadb") {
      return `mysql://${user}:${password}@${host}:${port}/${database}`;
    }
    return "";
  };

  const testConnection = async () => {
    const data = getValues();
    const connectionString = buildConnectionString(data);
    
    if (!connectionString) {
      setConnectionStatus("Please enter connection details");
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const result = await invoke<string>("test_connection", {
        dbType: data.dbType,
        connectionString: connectionString,
      });
      setConnectionStatus(result);
    } catch (err: any) {
      setConnectionStatus(`Error: ${err}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (activeTab === "database") {
      const lastUsed = {
        dbType: data.dbType,
        connectionMode: data.connectionMode,
        connectionString: data.connectionString,
        host: data.host,
        port: data.port,
        database: data.database,
        user: data.user,
        password: data.password,
        style: diagramStyle,
        theme: theme,
        curve: curve,
      };
      localStorage.setItem("sql-ide-last-connection", JSON.stringify(lastUsed));
    }

    setLoading(true);
    setError(null);
    setMermaidCode("");

    try {
      let connectionString = buildConnectionString(data);

      const payload: GenerateRequest = {
        type: activeTab === "database" ? data.dbType : "sql",
        connectionString: connectionString || undefined,
        sql: data.sql || undefined,
        style: diagramStyle,
        config: {
          theme,
          curve,
        },
      };

      // Call Tauri command directly
      const result = await invoke<{ mermaidCode: string }>("generate_diagram", {
        request: payload,
      });

      setMermaidCode(result.mermaidCode);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const loadSampleSql = () => {
    const sample = `
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(200),
    content TEXT,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);
    `;
    setValue("sql", sample.trim());
  };

  return (
    <div>
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
          ER Diagram Generator
        </h1>
        <p className="text-zinc-400">
          Generate Chen-style (Crow's Foot) ER diagrams from your database or SQL code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
            <div className="flex flex-wrap border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("database")}
                className={twMerge(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === "database"
                    ? "bg-zinc-800 text-blue-400 border-b-2 border-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800"
                )}
              >
                <Database className="w-4 h-4" />
                Database
              </button>
              <button
                onClick={() => setActiveTab("sql")}
                className={twMerge(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === "sql"
                    ? "bg-zinc-800 text-blue-400 border-b-2 border-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800"
                )}
              >
                <Code className="w-4 h-4" />
                SQL
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={twMerge(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  activeTab === "saved"
                    ? "bg-zinc-800 text-blue-400 border-b-2 border-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800"
                )}
              >
                <List className="w-4 h-4" />
                Saved
              </button>
              {appConnections.length > 0 && (
                <button
                  onClick={() => setActiveTab("app-connections")}
                  className={twMerge(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                    activeTab === "app-connections"
                      ? "bg-zinc-800 text-purple-400 border-b-2 border-purple-400"
                      : "text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  <Link className="w-4 h-4" />
                  App
                </button>
              )}
            </div>

            <div className="p-6">
              {activeTab === "app-connections" ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 mb-4">
                    Use connections from Connection Manager
                  </p>
                  <div className="space-y-3">
                    {appConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-zinc-800/50"
                      >
                        <div className="min-w-0">
                          <h4 className="font-medium text-zinc-100 truncate">
                            {conn.name}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {conn.dbType} • {conn.host || "localhost"}:{conn.port || "5432"}
                          </p>
                        </div>
                        <button
                          onClick={() => loadAppConnection(conn)}
                          className="p-2 text-purple-400 hover:bg-purple-900/20 rounded-md transition-colors"
                          title="Use Connection"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "saved" ? (
                <div className="space-y-4">
                  {savedConnections.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                      <p>No saved connections yet.</p>
                      <p className="text-xs mt-1">Save a connection from the Database tab.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-zinc-800/50"
                        >
                          <div className="min-w-0">
                            <h4 className="font-medium text-zinc-100 truncate">
                              {conn.name}
                            </h4>
                            <p className="text-xs text-zinc-400">
                              {conn.dbType} • {conn.connectionMode === "string" ? "URL" : "Manual"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => loadConnection(conn.id)}
                              className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors"
                              title="Load Connection"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteConnection(conn.id)}
                              className="p-2 text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete Connection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {activeTab === "database" ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Database Type
                        </label>
                        <CustomSelect
                          value={watch("dbType")}
                          onChange={(value) => setValue("dbType", value)}
                          options={DB_TYPE_OPTIONS}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Connection Method
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                            <input
                              type="radio"
                              value="url"
                              {...register("connectionMode")}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Connection URL
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                            <input
                              type="radio"
                              value="manual"
                              {...register("connectionMode")}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            Manual Entry
                          </label>
                        </div>
                      </div>

                      {connectionMode === "url" ? (
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Connection String
                          </label>
                          <input
                            {...register("connectionString")}
                            placeholder={getPlaceholder()}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Direct connection to your database.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Host
                              </label>
                              <input
                                {...register("host")}
                                placeholder="localhost"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Port
                              </label>
                              <input
                                {...register("port")}
                                placeholder="5432"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                              Database Name
                            </label>
                            <input
                              {...register("database")}
                              placeholder="mydb"
                              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-1">
                                User
                              </label>
                              <input
                                {...register("user")}
                                placeholder="postgres"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Password
                              </label>
                              <input
                                type="password"
                                {...register("password")}
                                placeholder="••••••"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Test Connection Button */}
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={testingConnection}
                        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {testingConnection ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                        Test Connection
                      </button>
                      
                      {connectionStatus && (
                        <div className={clsx(
                          "p-2 text-sm rounded-md",
                          connectionStatus.startsWith("Error") || connectionStatus.startsWith("Connection failed")
                            ? "bg-red-900/20 text-red-400"
                            : "bg-green-900/20 text-green-400"
                        )}>
                          {connectionStatus}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-zinc-300">
                            SQL DDL
                          </label>
                          <button
                            type="button"
                            onClick={loadSampleSql}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Load Sample
                          </button>
                        </div>
                        <textarea
                          {...register("sql")}
                          rows={10}
                          placeholder="CREATE TABLE..."
                          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Diagram Style
                    </label>
                    <div className="flex gap-4 p-1 bg-zinc-800/50 rounded-lg w-fit">
                      <button
                        type="button"
                        onClick={() => setDiagramStyle("crows_foot")}
                        className={clsx(
                          "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                          diagramStyle === "crows_foot"
                            ? "bg-zinc-800 text-zinc-100 shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        Crow's Foot
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiagramStyle("chen")}
                        className={clsx(
                          "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                          diagramStyle === "chen"
                            ? "bg-zinc-800 text-zinc-100 shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        Chen's Notation
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Theme
                      </label>
                      <CustomSelect
                        value={theme}
                        onChange={setTheme}
                        options={THEME_OPTIONS}
                      />
                    </div>
                    {diagramStyle === "chen" && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Line Style
                        </label>
                        <CustomSelect
                          value={curve}
                          onChange={setCurve}
                          options={CURVE_OPTIONS}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Background
                    </label>
                    <CustomSelect
                      value={background}
                      onChange={(value) => setBackground(value as "light" | "dark" | "transparent")}
                      options={BACKGROUND_OPTIONS}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Generate Diagram
                    </button>
                    {activeTab === "database" && (
                      <button
                        type="button"
                        onClick={openSaveModal}
                        className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium px-4 py-2.5 rounded-lg transition-colors border border-zinc-700"
                        title="Save Connection"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md">
                      {error}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 h-full min-h-[500px] flex flex-col">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <h2 className="font-semibold text-zinc-100">
                Diagram Preview
              </h2>
              {mermaidCode && (
                <button
                  onClick={() => navigator.clipboard.writeText(mermaidCode)}
                  className="text-xs text-zinc-500 hover:text-zinc-100"
                >
                  Copy Mermaid Code
                </button>
              )}
            </div>
            <div className="flex-1 p-6 bg-zinc-950/50 overflow-hidden flex flex-col">
              {mermaidCode ? (
                <MermaidDiagram code={mermaidCode} background={background} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-4">
                  <Server className="w-12 h-12 opacity-20" />
                  <p>Enter your database details or SQL to generate a diagram</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Connection"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Connection Name
            </label>
            <input
              value={newConnectionName}
              onChange={(e) => setNewConnectionName(e.target.value)}
              placeholder="e.g., Local Postgres"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {saveError && (
              <p className="text-xs text-red-600 mt-1">{saveError}</p>
            )}
          </div>

          {savedConnections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Or overwrite existing:
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-zinc-700 rounded-md p-1">
                {savedConnections.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => setNewConnectionName(conn.name)}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      newConnectionName.trim().toLowerCase() === conn.name.toLowerCase()
                        ? "bg-blue-900/20 text-blue-300"
                        : "hover:bg-zinc-800 text-zinc-300"
                    )}
                  >
                    {conn.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConnection}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {savedConnections.some(c => c.name.toLowerCase() === newConnectionName.trim().toLowerCase()) 
                ? "Overwrite" 
                : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </div>
  );
}
