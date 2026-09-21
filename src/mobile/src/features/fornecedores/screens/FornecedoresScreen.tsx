import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import { useFornecedores } from "../hooks/useFornecedores";
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
  Fornecedor,
  FornecedorCreateDto,
  FornecedorUpdateDto,
} from "../domain/types";
import { DependencyConflictError } from "@/src/shared/api/errors";

const FORM_FIELDS: FormField[] = [
  {
    name: "nome",
    label: "Nome do fornecedor",
    placeholder: "Nome do fornecedor",
  },
  {
    name: "cnpj",
    label: "CNPJ (opcional)",
    placeholder: "CNPJ (opcional)",
  },
  {
    name: "contato",
    label: "Contato (opcional)",
    placeholder: "Contato (opcional)",
  },
];

function itemToMetadata(item: Fornecedor): MetadataItem[] {
  return [
    { label: "CNPJ", value: item.cnpj ?? "-" },
    { label: "Contato", value: item.contato ?? "-" },
  ];
}

function itemToValues(item?: Fornecedor): Record<string, string> {
  if (!item) return { nome: "", cnpj: "", contato: "" };
  return { nome: item.nome, cnpj: item.cnpj ?? "", contato: item.contato ?? "" };
}

export default function FornecedoresScreen() {
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
  } = useFornecedores();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Fornecedor | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Fornecedor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormValues({ nome: "", cnpj: "", contato: "" });
    setFormVisible(true);
  }, []);

  const handleOpenEdit = useCallback((item: Fornecedor) => {
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
        const dto: FornecedorUpdateDto = {};
        if (nome !== editingItem.nome) dto.nome = nome;

        const cnpj = formValues.cnpj?.trim() ?? "";
        if (cnpj !== (editingItem.cnpj ?? "")) dto.cnpj = cnpj;

        const contato = formValues.contato?.trim() ?? "";
        if (contato !== (editingItem.contato ?? "")) dto.contato = contato;

        await update(editingItem.id, dto);
      } else {
        const dto: FornecedorCreateDto = { nome };
        const cnpj = formValues.cnpj?.trim();
        const contato = formValues.contato?.trim();
        if (cnpj) dto.cnpj = cnpj;
        if (contato) dto.contato = contato;
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

  const handleOpenDelete = useCallback((item: Fornecedor) => {
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
        setDeleteError(err.message || "Este fornecedor está em uso e não pode ser excluído.");
      } else {
        setDeleteVisible(false);
      }
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Fornecedor" : "Novo Fornecedor";

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar fornecedores..."
        testID="fornecedores-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum fornecedor encontrado."
        emptyActionLabel="Criar fornecedor"
        onEmptyAction={handleOpenCreate}
        testID="fornecedores-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={item.nome}
            metadata={itemToMetadata(item)}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`fornecedor-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="fornecedores-fab"
        accessibilityLabel="Criar fornecedor"
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
        testID="fornecedores-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.nome ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        error={deleteError}
        testID="fornecedores-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
