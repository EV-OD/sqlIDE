import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Database,
  Edit2,
  Plus,
  Trash2,
  Check,
  X,
  Server,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { testConnection } from "../../services/database";
import type { SavedConnection } from "../../types";

type ConnectionFormData = Omit<SavedConnection, "id">;

interface TestResult {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL", defaultPort: "5432" },
  { value: "mysql", label: "MySQL", defaultPort: "3306" },
  { value: "mariadb", label: "MariaDB", defaultPort: "3306" },
  { value: "sqlite", label: "SQLite", defaultPort: "" },
  { value: "mssql", label: "SQL Server", defaultPort: "1433" },
] as const;

export default function ConnectionManagerPage() {
  const {
    connections,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    setCurrentPage,
  } = useAppStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult>({ status: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ConnectionFormData>({
    defaultValues: {
      name: "",
      dbType: "postgresql",
      connectionMode: "params",
      host: "localhost",
      port: "5432",
      database: "",
      user: "",
      password: "",
    },
  });

  const connectionMode = watch("connectionMode");
  const dbType = watch("dbType");

  const handleDbTypeChange = (type: string) => {
    const dbConfig = DB_TYPES.find((db) => db.value === type);
    if (dbConfig) {
      setValue("port", dbConfig.defaultPort);
    }
  };

  const openNewForm = () => {
    reset({
      name: "",
      dbType: "postgresql",
      connectionMode: "params",
      host: "localhost",
      port: "5432",
      database: "",
      user: "",
      password: "",
    });
    setEditingId(null);
    setTestResult({ status: "idle" });
    setIsFormOpen(true);
  };

  const openEditForm = (connection: SavedConnection) => {
    reset(connection);
    setEditingId(connection.id);
    setTestResult({ status: "idle" });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTestResult({ status: "idle" });
    reset();
  };

  const onSubmit = (data: ConnectionFormData) => {
    if (editingId) {
      updateConnection(editingId, data);
    } else {
      addConnection(data);
    }
    closeForm();
  };

  const handleTestConnection = async () => {
    const values = getValues();
    setTestResult({ status: "testing" });
    
    try {
      const message = await testConnection({
        ...values,
        id: editingId || "temp",
      } as SavedConnection);
      setTestResult({ status: "success", message });
    } catch (error) {
      setTestResult({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleConnect = (connection: SavedConnection) => {
    setActiveConnection(connection);
    setCurrentPage("editor");
  };

  const handleDelete = (id: string) => {
    deleteConnection(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage("welcome")}
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
            onClick={openNewForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Connection
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Connection Form */}
        {isFormOpen && (
          <div className="mb-8 bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              {editingId ? "Edit Connection" : "New Connection"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Connection Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Connection Name
                </label>
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="My Database"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Database Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Database Type
                </label>
                <select
                  {...register("dbType")}
                  onChange={(e) => {
                    register("dbType").onChange(e);
                    handleDbTypeChange(e.target.value);
                  }}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 [&>option]:bg-zinc-900 [&>option]:text-white"
                >
                  {DB_TYPES.map((db) => (
                    <option key={db.value} value={db.value} className="bg-zinc-900 text-white">
                      {db.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Connection Mode */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Connection Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register("connectionMode")}
                      value="params"
                      className="text-blue-500"
                    />
                    <span className="text-zinc-300">Parameters</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register("connectionMode")}
                      value="string"
                      className="text-blue-500"
                    />
                    <span className="text-zinc-300">Connection String</span>
                  </label>
                </div>
              </div>

              {connectionMode === "string" ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Connection String
                  </label>
                  <input
                    {...register("connectionString")}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder={`${dbType}://user:password@localhost:5432/database`}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Host
                    </label>
                    <input
                      {...register("host")}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Port
                    </label>
                    <input
                      {...register("port")}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      placeholder="5432"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Database
                    </label>
                    <input
                      {...register("database")}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      placeholder="mydb"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Username
                    </label>
                    <input
                      {...register("user")}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      placeholder="postgres"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      {...register("password")}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Test Connection Result */}
              {testResult.status !== "idle" && (
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    testResult.status === "testing"
                      ? "bg-blue-900/20 border border-blue-800"
                      : testResult.status === "success"
                      ? "bg-green-900/20 border border-green-800"
                      : "bg-red-900/20 border border-red-800"
                  }`}
                >
                  {testResult.status === "testing" && (
                    <>
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-blue-400">Testing connection...</span>
                    </>
                  )}
                  {testResult.status === "success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">{testResult.message}</span>
                    </>
                  )}
                  {testResult.status === "error" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 text-sm">{testResult.message}</span>
                    </>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-between pt-4 border-t border-zinc-700">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testResult.status === "testing"}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {testResult.status === "testing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  Test Connection
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingId ? "Save Changes" : "Create Connection"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Connections List */}
        {connections.length === 0 && !isFormOpen ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
              <Server className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No connections yet</h3>
            <p className="text-zinc-500 mb-6">
              Create your first database connection to get started
            </p>
            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Connection
            </button>
          </div>
        ) : (
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
                        onClick={() => handleDelete(conn.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Confirm delete"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditForm(conn)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(conn.id)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleConnect(conn)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
