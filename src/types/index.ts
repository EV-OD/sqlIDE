export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTargetTable?: string;
  foreignKeyTargetColumn?: string;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Schema {
  tables: Table[];
}

export interface MermaidConfig {
  theme?: string;
  curve?: string;
}

export interface GenerateRequest {
  type: string;
  connectionString?: string;
  sql?: string;
  style?: "crows_foot" | "chen";
  config?: MermaidConfig;
}

export interface GenerateResponse {
  mermaidCode: string;
}

export interface SavedConnection {
  id: string;
  name: string;
  dbType: string;
  connectionMode: string;
  connectionString?: string;
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  style?: "crows_foot" | "chen";
  theme?: string;
  curve?: string;
}

export type Tab = "database" | "sql" | "saved";
export type DiagramStyle = "crows_foot" | "chen";
