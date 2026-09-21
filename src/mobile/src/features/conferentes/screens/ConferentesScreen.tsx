import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import { useConferentes } from "../hooks/useConferentes";
import {
  EntityListScaffold,
  DenseEntityCard,
  EntityFormSheet,
  ConfirmDeleteDialog,
  SearchFilterBar,
} from "@/src/shared/ui/admin";
import type { FormField } from "@/src/shared/ui/admin/EntityFormSheet";
import type { MetadataItem } from "@/src/shared/ui/admin/DenseEntityCard";
import type {
  Conferente,
  ConferenteCreateDto,
  ConferenteUpdateDto,
} from "../domain/types";
import { DependencyConflictError } from "@/src/shared/api/errors";

const FORM_FIELDS: FormField[] = [
  { name: "nome", label: "Nome do conferente", placeholder: "Nome do conferente" },
  {
    name: "email",
    label: "Email (opcional)",
    placeholder: "Email (opcional)",
  },
];

function itemToMetadata(item: Conferente): MetadataItem[] {
  return [{ label: "Email", value: item.email ?? "-" }];
}

function itemToValues(item?: Conferente): Record<string, string> {
  if (!item) return { nome: "", email: "" };
  return { nome: item.nome, email: item.email ?? "" };
}

export default function ConferentesScreen() {
  const {
    filteredData,
    loading,
    error,
    searchQuery,
    load,
    create,
    update,
    remove,
    setSearchQuery,
  } = useConferentes();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Conferente | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Conferente | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormValues({ nome: "", email: "" });
    setFormVisible(true);
  }, []);

  const handleOpenEdit = useCallback((item: Conferente) => {
    setEditingItem(item);
    setFormValues(itemToValues(item));
    setFormVisible(true);
  }, []);

  const handleFormChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const nome = formValues.nome?.trim();
    if (!nome) return;

    setSaving(true);
    try {
      if (editingItem) {
        const dto: ConferenteUpdateDto = {};
        if (nome !== editingItem.nome) dto.nome = nome;

        const email = formValues.email?.trim() ?? "";
        if (email !== (editingItem.email ?? "")) dto.email = email;

        await update(editingItem.id, dto);
      } else {
        const dto: ConferenteCreateDto = { nome };
        const email = formValues.email?.trim();
        if (email) dto.email = email;
        await create(dto);
      }
      setFormVisible(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }, [formValues, editingItem, create, update]);

  const handleCancelForm = useCallback(() => {
    setFormVisible(false);
  }, []);

  const handleOpenDelete = useCallback((item: Conferente) => {
    setDeletingItem(item);
    setDeleteError(null);
    setDeleteVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await remove(deletingItem.id);
      setDeleteVisible(false);
    } catch (err) {
      if (err instanceof DependencyConflictError) {
        setDeleteError(err.message || "Este conferente está em uso e não pode ser excluído.");
      } else {
        setDeleteVisible(false);
      }
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Conferente" : "Novo Conferente";

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar conferentes..."
        testID="conferentes-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum conferente encontrado."
        emptyActionLabel="Criar conferente"
        onEmptyAction={handleOpenCreate}
        testID="conferentes-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={item.nome}
            metadata={itemToMetadata(item)}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`conferente-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="conferentes-fab"
        accessibilityLabel="Criar conferente"
      />
      <EntityFormSheet
        visible={formVisible}
        title={formTitle}
        fields={FORM_FIELDS}
        values={formValues}
        onChange={handleFormChange}
        onSave={handleSave}
        onCancel={handleCancelForm}
        saving={saving}
        testID="conferentes-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.nome ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        error={deleteError}
        testID="conferentes-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
