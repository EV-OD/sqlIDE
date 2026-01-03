import { ContextMenu } from "./ContextMenu";
import { FileNode } from "./FileNode";
import { NewItemInput } from "./NewItemInput";
import { ProjectHeader } from "./ProjectHeader";
import { EmptyState } from "./EmptyState";
import { useProjectManager } from "./useProjectManager";

export default function ProjectManager() {
  const {
    // State
    projectFiles,
    projectPath,
    projectName,
    contextMenu,
    isCreating,
    newItemName,
    renamingId,
    renameValue,

    // Setters
    setNewItemName,
    setRenameValue,

    // Handlers
    handleFileClick,
    handleContextMenu,
    handleNewFile,
    handleNewFolder,
    handleCreateItem,
    handleRename,
    handleRenameSubmit,
    handleRenameCancel,
    handleDelete,
    handleCloseContextMenu,
    handleCancelCreate,
    startNewFile,
    startNewFolder,
  } = useProjectManager();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <ProjectHeader
        projectName={projectName}
        projectPath={projectPath}
        onNewFile={startNewFile}
        onNewFolder={startNewFolder}
      />

      {/* Tree View */}
      <div
        className="flex-1 overflow-auto py-2"
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        {/* New Item Input at root level */}
        {isCreating && !isCreating.parentId && (
          <NewItemInput
            isCreating={isCreating}
            level={0}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            onCreateItem={handleCreateItem}
            onCancelCreate={handleCancelCreate}
          />
        )}

        {projectFiles.length === 0 && !isCreating ? (
          <EmptyState />
        ) : (
          projectFiles.map((file) => (
            <FileNode
              key={file.id}
              file={file}
              level={0}
              projectPath={projectPath || ""}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              isCreating={isCreating}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              onCreateItem={handleCreateItem}
              onCancelCreate={handleCancelCreate}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={handleRenameCancel}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={handleCloseContextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
