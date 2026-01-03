import type { SavedConnection } from "../../../types";

export type ConnectionFormData = Omit<SavedConnection, "id">;

export interface TestResult {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

export const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL", defaultPort: "5432" },
  { value: "mysql", label: "MySQL", defaultPort: "3306" },
  { value: "mariadb", label: "MariaDB", defaultPort: "3306" },
  { value: "sqlite", label: "SQLite", defaultPort: "" },
  { value: "mssql", label: "SQL Server", defaultPort: "1433" },
] as const;
