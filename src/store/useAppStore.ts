import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  AppPage,
  SavedConnection,
  ProjectFile,
  EditorTab,
  QueryResult,
  DatabaseInfo,
  DiagramSettings,
} from "../types";

interface AppState {
  // Navigation
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;

  // Connections
  connections: SavedConnection[];
  activeConnection: SavedConnection | null;
  addConnection: (connection: Omit<SavedConnection, "id">) => void;
  updateConnection: (id: string, connection: Partial<SavedConnection>) => void;
  deleteConnection: (id: string) => void;
  setActiveConnection: (connection: SavedConnection | null) => void;

  // Database Explorer
  databases: DatabaseInfo[];
  setDatabases: (databases: DatabaseInfo[]) => void;
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;

  // Project Manager
  projectPath: string | null;
  projectName: string;
  projectFiles: ProjectFile[];
  setProjectPath: (path: string) => void;
  setProjectName: (name: string) => void;
  addProjectFile: (file: Omit<ProjectFile, "id" | "createdAt" | "updatedAt">) => string;
  updateProjectFile: (id: string, updates: Partial<ProjectFile>) => void;
  deleteProjectFile: (id: string) => void;
  moveProjectFile: (fileId: string, newParentId: string | null) => void;

  // Editor
  editorTabs: EditorTab[];
  activeTabId: string | null;
  addEditorTab: (tab: Omit<EditorTab, "id">) => void;
  updateEditorTab: (id: string, updates: Partial<EditorTab>) => void;
  closeEditorTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Query Results
  queryResults: QueryResult | null;
  isExecutingQuery: boolean;
  setQueryResults: (results: QueryResult | null) => void;
  setIsExecutingQuery: (isExecuting: boolean) => void;

  // Sidebar
  activeSidebarTab: "database" | "project" | "diagram";
  setActiveSidebarTab: (tab: "database" | "project" | "diagram") => void;

  // Diagram Settings (for active diagram tab)
  diagramSettings: DiagramSettings;
  setDiagramSettings: (settings: Partial<DiagramSettings>) => void;

  // Open ER Diagram for a connection
  openErDiagram: (connection: SavedConnection, databaseName?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation
      currentPage: "welcome",
      setCurrentPage: (page) => set({ currentPage: page }),

      // Connections
      connections: [],
      activeConnection: null,
      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, { ...connection, id: uuidv4() }],
        })),
      updateConnection: (id, connection) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...connection } : c
          ),
        })),
      deleteConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          activeConnection:
            state.activeConnection?.id === id ? null : state.activeConnection,
        })),
      setActiveConnection: (connection) => set({ activeConnection: connection }),

      // Database Explorer
      databases: [],
      setDatabases: (databases) => set({ databases }),
      expandedNodes: new Set(),
      toggleNode: (nodeId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
          } else {
            newExpanded.add(nodeId);
          }
          return { expandedNodes: newExpanded };
        }),

      // Project Manager
      projectPath: null,
      projectName: "Project",
      projectFiles: [],
      setProjectPath: (path) => set({ projectPath: path }),
      setProjectName: (name) => set({ projectName: name }),
      addProjectFile: (file) => {
        const id = uuidv4();
        const now = new Date();
        const newFile: ProjectFile = {
          ...file,
          id,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => {
          // If has parentId, we need to add it to the parent's children
          if (file.parentId) {
            const updateChildren = (files: ProjectFile[]): ProjectFile[] => {
              return files.map(f => {
                if (f.id === file.parentId) {
                  return {
                    },
                    {
                      name: "sql-ide-storage",
                  };
                }
                if (f.children && f.children.length > 0) {
                  return {
                    ...f,
                    children: updateChildren(f.children),
                  };
                }
                return f;
              });
            };
            return { projectFiles: updateChildren(state.projectFiles) };
          }
          // Root level file
          return { projectFiles: [...state.projectFiles, newFile] };
        });
        
        return id;
      },
      updateProjectFile: (id, updates) =>
        set((state) => {
          const updateFile = (files: ProjectFile[]): ProjectFile[] => {
            return files.map(f => {
              if (f.id === id) {
                return { ...f, ...updates, updatedAt: new Date() };
              }
              if (f.children && f.children.length > 0) {
                return { ...f, children: updateFile(f.children) };
              }
              return f;
            });
          };
          return { projectFiles: updateFile(state.projectFiles) };
        }),
      deleteProjectFile: (id) =>
        set((state) => {
          const deleteFile = (files: ProjectFile[]): ProjectFile[] => {
            return files
              .filter(f => f.id !== id)
              .map(f => {
                if (f.children && f.children.length > 0) {
                  return { ...f, children: deleteFile(f.children) };
                }
                return f;
              });
          };
          return { projectFiles: deleteFile(state.projectFiles) };
        }),
      moveProjectFile: (fileId, newParentId) =>
        set((state) => {
          // Helper to find file by ID
          const findFile = (files: ProjectFile[], id: string): ProjectFile | null => {
            for (const f of files) {
              if (f.id === id) return f;
              if (f.children) {
                const found = findFile(f.children, id);
                if (found) return found;
              }
            }
            return null;
          };
          
          const fileToMove = findFile(state.projectFiles, fileId);
          if (!fileToMove) return state;
          
          // Remove the file from its current location
          const removeFile = (files: ProjectFile[]): ProjectFile[] => {
            return files
              .filter(f => f.id !== fileId)
              .map(f => {
                if (f.children && f.children.length > 0) {
                  return { ...f, children: removeFile(f.children) };
                }
                return f;
              });
          };
          
          const newFiles = removeFile(state.projectFiles);
          
          // Create updated file with new parentId
          const updatedFile: ProjectFile = {
            ...fileToMove,
            parentId: newParentId || undefined,
          };
          
          if (newParentId === null) {
            // Add to root
            return { projectFiles: [...newFiles, updatedFile] };
          } else {
            // Add to parent's children
            const addToParent = (files: ProjectFile[]): ProjectFile[] => {
              return files.map(f => {
                if (f.id === newParentId) {
                  return {
                    ...f,
                    children: [...(f.children || []), updatedFile],
                  };
                }
                if (f.children && f.children.length > 0) {
                  return { ...f, children: addToParent(f.children) };
                }
                return f;
              });
            };
            return { projectFiles: addToParent(newFiles) };
          }
        }),

      // Editor
      editorTabs: [],
      activeTabId: null,
      addEditorTab: (tab) => {
        const id = uuidv4();
        set((state) => ({
          editorTabs: [...state.editorTabs, { ...tab, id }],
          activeTabId: id,
        }));
      },
      updateEditorTab: (id, updates) =>
        set((state) => ({
          editorTabs: state.editorTabs.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      closeEditorTab: (id) =>
        set((state) => {
          const tabs = state.editorTabs.filter((t) => t.id !== id);
          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            const index = state.editorTabs.findIndex((t) => t.id === id);
            newActiveId = tabs[index]?.id || tabs[index - 1]?.id || null;
          }
          return { editorTabs: tabs, activeTabId: newActiveId };
        }),
      setActiveTab: (id) => set({ activeTabId: id }),

      // Query Results
      queryResults: null,
      isExecutingQuery: false,
      setQueryResults: (results) => set({ queryResults: results }),
      setIsExecutingQuery: (isExecuting) => set({ isExecutingQuery: isExecuting }),

      // Sidebar
      activeSidebarTab: "database",
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

      // Diagram Settings
      diagramSettings: {
        style: "chen",
        theme: "default",
        curve: "basis",
        background: "light",
      },
      setDiagramSettings: (settings) =>
        set((state) => ({
          diagramSettings: { ...state.diagramSettings, ...settings },
        })),

      // Open ER Diagram for a connection
      openErDiagram: (connection, databaseName) => {
        const id = uuidv4();
        set((state) => {
          // Check if there's already a diagram tab for this connection and database
          const existingTab = state.editorTabs.find(
            (t) => t.type === "diagram" && t.connectionId === connection.id && t.databaseName === databaseName
          );
          if (existingTab) {
            return { activeTabId: existingTab.id, activeSidebarTab: "diagram" };
          }

          const tabName = databaseName ? `ER: ${databaseName}` : `ER: ${connection.name}`;
          const newTab: EditorTab = {
            id,
            name: tabName,
            type: "diagram",
            content: "",
            connectionId: connection.id,
            databaseName: databaseName,
            diagramStyle: connection.style || "chen",
            diagramTheme: connection.theme || "default",
            diagramCurve: connection.curve || "basis",
            isDirty: false,
          };

          return {
            editorTabs: [...state.editorTabs, newTab],
            activeTabId: id,
            activeSidebarTab: "diagram",
            diagramSettings: {
              style: connection.style || "chen",
              theme: connection.theme || "default",
              curve: connection.curve || "basis",
              background: "light",
            },
          };
        });
      },
    }),
    {
      name: "sql-ide-storage",
      partialize: (state) => ({
        connections: state.connections,
        projectFiles: state.projectFiles,
        projectPath: state.projectPath,
        projectName: state.projectName,
      }),
    }
  )
);
