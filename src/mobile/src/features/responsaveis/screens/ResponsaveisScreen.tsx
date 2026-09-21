import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import { useResponsaveis } from "../hooks/useResponsaveis";
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
  Responsavel,
  ResponsavelCreateDto,
  ResponsavelUpdateDto,
} from "../domain/types";
import { DependencyConflictError } from "@/src/shared/api/errors";

const FORM_FIELDS: FormField[] = [
  {
    name: "nome",
    label: "Nome do responsável",
    placeholder: "Nome do responsável",
  },
  {
    name: "email",
    label: "E-mail (opcional)",
    placeholder: "E-mail (opcional)",
  },
  {
    name: "telefone",
    label: "Telefone (opcional)",
    placeholder: "Telefone (opcional)",
  },
];

function itemToMetadata(item: Responsavel): MetadataItem[] {
  return [
    { label: "E-mail", value: item.email ?? "-" },
    { label: "Telefone", value: item.telefone ?? "-" },
  ];
}

function itemToValues(item?: Responsavel): Record<string, string> {
  if (!item) return { nome: "", email: "", telefone: "" };
  return {
    nome: item.nome,
    email: item.email ?? "",
    telefone: item.telefone ?? "",
  };
}

export default function ResponsaveisScreen() {
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
  } = useResponsaveis();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Responsavel | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Responsavel | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormValues({ nome: "", email: "", telefone: "" });
    setFormVisible(true);
  }, []);

  const handleOpenEdit = useCallback((item: Responsavel) => {
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
        const dto: ResponsavelUpdateDto = {};
        if (nome !== editingItem.nome) dto.nome = nome;

        const email = formValues.email?.trim() ?? "";
        if (email !== (editingItem.email ?? "")) dto.email = email;

        const telefone = formValues.telefone?.trim() ?? "";
        if (telefone !== (editingItem.telefone ?? "")) dto.telefone = telefone;

        await update(editingItem.id, dto);
      } else {
        const dto: ResponsavelCreateDto = { nome };
        const email = formValues.email?.trim();
        const telefone = formValues.telefone?.trim();
        if (email) dto.email = email;
        if (telefone) dto.telefone = telefone;
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

  const handleOpenDelete = useCallback((item: Responsavel) => {
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
        setDeleteError(err.message || "Este responsável está em uso e não pode ser excluído.");
      } else {
        setDeleteVisible(false);
      }
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Responsável" : "Novo Responsável";

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar responsáveis..."
        testID="responsaveis-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum responsável encontrado."
        emptyActionLabel="Criar responsável"
        onEmptyAction={handleOpenCreate}
        testID="responsaveis-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={item.nome}
            metadata={itemToMetadata(item)}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`responsavel-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="responsaveis-fab"
        accessibilityLabel="Criar responsável"
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
        testID="responsaveis-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.nome ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        error={deleteError}
        testID="responsaveis-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
