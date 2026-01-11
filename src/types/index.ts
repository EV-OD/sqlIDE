export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTargetTable?: string;
  foreignKeyTargetColumn?: string;
  isMultivalued?: boolean;
  isDerived?: boolean;
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
  schema: Schema;
}

export interface SavedConnection {
  id: string;
  name: string;
  dbType: "postgresql" | "mysql" | "mariadb" | "sqlite" | "mssql";
  connectionMode: "string" | "params";
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

// SQL Editor Types
export interface DatabaseConnection extends SavedConnection {
  isConnected?: boolean;
}

export interface DatabaseTable {
  name: string;
  schema?: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

export interface DatabaseInfo {
  name: string;
  schemas?: DatabaseSchema[];
  tables?: DatabaseTable[];
}

// Project Manager Types
export interface ProjectFile {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: ProjectFile[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
}

// Query Results
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  error?: string;
}

// Editor Tab
export interface EditorTab {
  id: string;
  name: string;
  type: "sql" | "diagram";
  content: string;
  fileId?: string;
  filePath?: string;
  isDirty: boolean;
  // For diagram tabs
  connectionId?: string;
  databaseName?: string;
  diagramStyle?: DiagramStyle;
  diagramTheme?: string;
  diagramCurve?: string;
  diagramBackground?: string;
  schema?: Schema;
}

// Diagram Settings
export interface DiagramSettings {
  style: DiagramStyle;
  theme: string;
  curve: string;
  background: string;
}

// App State
export type AppPage = "welcome" | "connection-manager" | "editor" | "er-generator" | "mariadb-manager";
