import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import { useEstadosItem } from "../hooks/useEstadosItem";
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
  EstadoItem,
  EstadoItemCreateDto,
  EstadoItemUpdateDto,
} from "../domain/types";
import { DependencyConflictError } from "@/src/shared/api/errors";

const FORM_FIELDS: FormField[] = [
  { name: "nome", label: "Nome do estado", placeholder: "Nome do estado" },
  {
    name: "descricao",
    label: "Descrição (opcional)",
    placeholder: "Descrição (opcional)",
    multiline: true,
  },
];

function itemToMetadata(item: EstadoItem): MetadataItem[] {
  const meta: MetadataItem[] = [];
  if (item.descricao) {
    meta.push({ label: "Descrição", value: item.descricao });
  }
  return meta;
}

function itemToValues(item?: EstadoItem): Record<string, string> {
  if (!item) return { nome: "", descricao: "" };
  return { nome: item.nome, descricao: item.descricao ?? "" };
}

export default function EstadosItemScreen() {
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
  } = useEstadosItem();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<EstadoItem | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<EstadoItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormValues({ nome: "", descricao: "" });
    setFormVisible(true);
  }, []);

  const handleOpenEdit = useCallback((item: EstadoItem) => {
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
        const dto: EstadoItemUpdateDto = {};
        if (nome !== editingItem.nome) dto.nome = nome;
        const descricaoChanged =
          (formValues.descricao?.trim() ?? "") !== (editingItem.descricao ?? "");
        if (descricaoChanged) {
          const trimmed = formValues.descricao?.trim();
          if (trimmed) {
            dto.descricao = trimmed;
          }
        }
        await update(editingItem.id, dto);
      } else {
        const trimmedDescricao = formValues.descricao?.trim();
        const dto: EstadoItemCreateDto = { nome };
        if (trimmedDescricao) {
          dto.descricao = trimmedDescricao;
        }
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

  const handleOpenDelete = useCallback((item: EstadoItem) => {
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
        setDeleteError(
          err.message || "Este estado do item está em uso e não pode ser excluído.",
        );
      } else {
        setDeleteVisible(false);
      }
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Estado do Item" : "Novo Estado do Item";

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar estados do item..."
        testID="estados-item-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum estado do item encontrado."
        emptyActionLabel="Criar estado do item"
        onEmptyAction={handleOpenCreate}
        testID="estados-item-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={item.nome}
            metadata={itemToMetadata(item)}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`estado-item-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="estados-item-fab"
        accessibilityLabel="Criar estado do item"
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
        testID="estados-item-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.nome ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        error={deleteError}
        testID="estados-item-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
