import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import { CustomSelect } from "../../ui/CustomSelect";
import { DB_TYPES, type ConnectionFormData, type TestResult } from "./types";

const DB_TYPE_OPTIONS = DB_TYPES.map((db) => ({
  value: db.value,
  label: db.label,
}));

interface ConnectionFormProps {
  editingId: string | null;
  register: UseFormRegister<ConnectionFormData>;
  watch: UseFormWatch<ConnectionFormData>;
  setValue: UseFormSetValue<ConnectionFormData>;
  errors: FieldErrors<ConnectionFormData>;
  testResult: TestResult;
  onSubmit: () => void;
  onTestConnection: () => void;
  onCancel: () => void;
}

export function ConnectionForm({
  editingId,
  register,
  watch,
  setValue,
  errors,
  testResult,
  onSubmit,
  onTestConnection,
  onCancel,
}: ConnectionFormProps) {
  const connectionMode = watch("connectionMode");
  const dbType = watch("dbType");

  const handleDbTypeChange = (type: string) => {
    const dbConfig = DB_TYPES.find((db) => db.value === type);
    if (dbConfig) {
      setValue("port", dbConfig.defaultPort);
    }
  };

  return (
    <div className="mb-8 bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6">
        {editingId ? "Edit Connection" : "New Connection"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-6">
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
          <CustomSelect
            value={dbType}
            onChange={(value) => {
              setValue("dbType", value as ConnectionFormData["dbType"]);
              handleDbTypeChange(value);
            }}
            options={DB_TYPE_OPTIONS}
          />
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
                <span className="text-zinc-500 font-normal ml-2">(optional)</span>
              </label>
              <input
                {...register("database")}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                placeholder="Leave empty to browse all databases"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Leave empty to see all available databases
              </p>
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
            onClick={onTestConnection}
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
              onClick={onCancel}
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
  );
}
