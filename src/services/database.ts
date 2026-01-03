import { invoke } from "@tauri-apps/api/core";
import type { SavedConnection, DatabaseInfo, QueryResult } from "../types";

export interface ConnectionParams {
  dbType: string;
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
}

function connectionToParams(conn: SavedConnection): ConnectionParams {
  return {
    dbType: conn.dbType,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    password: conn.password,
    connectionString: conn.connectionString,
  };
}

export async function testConnection(conn: SavedConnection): Promise<string> {
  const params = connectionToParams(conn);
  return invoke<string>("test_connection_params", { params });
}

export async function getDatabases(conn: SavedConnection): Promise<DatabaseInfo[]> {
  const params = connectionToParams(conn);
  return invoke<DatabaseInfo[]>("get_databases", { params });
}

export async function executeQuery(
  conn: SavedConnection,
  query: string
): Promise<QueryResult> {
  const params = connectionToParams(conn);
  return invoke<QueryResult>("execute_query", { params, query });
}
