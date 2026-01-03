import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppStore } from "../../../store/useAppStore";
import { testConnection } from "../../../services/database";
import { PageHeader } from "./PageHeader";
import { ConnectionForm } from "./ConnectionForm";
import { ConnectionList } from "./ConnectionList";
import { EmptyState } from "./EmptyState";
import type { ConnectionFormData, TestResult } from "./types";
import type { SavedConnection } from "../../../types";

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
      <PageHeader
        onBack={() => setCurrentPage("welcome")}
        onNewConnection={openNewForm}
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isFormOpen && (
          <ConnectionForm
            editingId={editingId}
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            testResult={testResult}
            onSubmit={handleSubmit(onSubmit)}
            onTestConnection={handleTestConnection}
            onCancel={closeForm}
          />
        )}

        {connections.length === 0 && !isFormOpen ? (
          <EmptyState onNewConnection={openNewForm} />
        ) : (
          <ConnectionList
            connections={connections}
            deleteConfirmId={deleteConfirmId}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onConnect={handleConnect}
            onDeleteConfirm={setDeleteConfirmId}
          />
        )}
      </div>
    </div>
  );
}
