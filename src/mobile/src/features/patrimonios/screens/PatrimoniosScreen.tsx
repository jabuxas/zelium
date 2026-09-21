import { useState, useEffect, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { usePatrimonios } from "../hooks/usePatrimonios";
import { usePatrimonioFotos } from "../hooks/usePatrimonioFotos";
import { PatrimonioPhotoRepositoryImpl } from "../data/photoRepository";
import { FotosSection } from "../components/FotosSection";
import { WebCamera } from "../components/WebCamera";
import type { WebCameraCapture } from "../components/WebCamera.types";
import { publicApiUrl } from "@/src/shared/config/env";
import { useToast } from "@/src/shared/ui/toast";
import { AmbienteRepositoryImpl } from "@/src/features/ambientes/data/repository";
import { EstadoItemRepositoryImpl } from "@/src/features/estados-item/data/repository";
import { FornecedorRepositoryImpl } from "@/src/features/fornecedores/data/repository";
import { ResponsavelRepositoryImpl } from "@/src/features/responsaveis/data/repository";
import { TipoMaterialRepositoryImpl } from "@/src/features/tipos-material/data/repository";
import {
  EntityListScaffold,
  DenseEntityCard,
  EntityFormSheet,
  ConfirmDeleteDialog,
  SearchFilterBar,
} from "@/src/shared/ui/admin";
import type {
  FormField,
  SelectOption,
} from "@/src/shared/ui/admin/EntityFormSheet";
import type { MetadataItem } from "@/src/shared/ui/admin/DenseEntityCard";
import type {
  Patrimonio,
  PatrimonioCreateDto,
  PatrimonioUpdateDto,
} from "../domain/types";
import type { Ambiente } from "@/src/features/ambientes/domain/types";
import type { EstadoItem } from "@/src/features/estados-item/domain/types";
import type { Fornecedor } from "@/src/features/fornecedores/domain/types";
import type { Responsavel } from "@/src/features/responsaveis/domain/types";
import type { TipoMaterial } from "@/src/features/tipos-material/domain/types";

const ambienteRepository = new AmbienteRepositoryImpl();
const estadoItemRepository = new EstadoItemRepositoryImpl();
const fornecedorRepository = new FornecedorRepositoryImpl();
const responsavelRepository = new ResponsavelRepositoryImpl();
const tipoMaterialRepository = new TipoMaterialRepositoryImpl();
const photoRepository = new PatrimonioPhotoRepositoryImpl();

type PatrimonioOptions = {
  tiposMaterial: SelectOption[];
  estadosItem: SelectOption[];
  ambientes: SelectOption[];
  responsaveis: SelectOption[];
  fornecedores: SelectOption[];
};

const EMPTY_OPTIONS: PatrimonioOptions = {
  tiposMaterial: [],
  estadosItem: [],
  ambientes: [],
  responsaveis: [],
  fornecedores: [],
};

function buildFormFields(options: PatrimonioOptions): FormField[] {
  return [
    {
      name: "numero_patrimonio",
      label: "Número do patrimônio",
      placeholder: "Ex.: PAT-001",
    },
    {
      name: "descricao",
      label: "Descrição",
      placeholder: "Descrição do patrimônio",
    },
    {
      name: "valor",
      label: "Valor",
      placeholder: "0,00",
      keyboardType: "decimal-pad",
    },
    {
      name: "tipo_material_id",
      label: "Tipo de material",
      placeholder: "Selecione o tipo de material",
      type: "select",
      options: options.tiposMaterial,
    },
    {
      name: "estado_item_id",
      label: "Estado do item",
      placeholder: "Selecione o estado do item",
      type: "select",
      options: options.estadosItem,
    },
    {
      name: "ambiente_id",
      label: "Ambiente",
      placeholder: "Selecione o ambiente",
      type: "select",
      options: options.ambientes,
    },
    {
      name: "responsavel_id",
      label: "Responsável",
      placeholder: "Selecione o responsável",
      type: "select",
      options: options.responsaveis,
    },
    {
      name: "fornecedor_id",
      label: "Fornecedor (opcional)",
      placeholder: "Selecione o fornecedor",
      type: "select",
      options: [{ label: "Sem fornecedor", value: "" }, ...options.fornecedores],
    },
    {
      name: "observacoes",
      label: "Observações (opcional)",
      placeholder: "Observações (opcional)",
      multiline: true,
    },
  ];
}

type PendingAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

const EMPTY_VALUES = {
  numero_patrimonio: "",
  descricao: "",
  valor: "",
  observacoes: "",
  tipo_material_id: "",
  estado_item_id: "",
  ambiente_id: "",
  responsavel_id: "",
  fornecedor_id: "",
};

function numberToCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRequiredId(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toOptions<T extends { id: number; nome: string }>(
  items: T[],
): SelectOption[] {
  return items.map((item) => ({ label: item.nome, value: String(item.id) }));
}

function optionLabel(
  options: SelectOption[],
  id: number | null | undefined,
): string {
  if (!id) return "-";
  return options.find((option) => option.value === String(id))?.label ?? `#${id}`;
}

function itemToMetadata(
  item: Patrimonio,
  options: PatrimonioOptions,
): MetadataItem[] {
  return [
    { label: "Valor", value: numberToCurrency(item.valor) },
    {
      label: "Tipo",
      value: optionLabel(options.tiposMaterial, item.tipo_material_id),
    },
    {
      label: "Estado",
      value: optionLabel(options.estadosItem, item.estado_item_id),
    },
    { label: "Ambiente", value: optionLabel(options.ambientes, item.ambiente_id) },
    {
      label: "Responsável",
      value: optionLabel(options.responsaveis, item.responsavel_id),
    },
    {
      label: "Fornecedor",
      value: optionLabel(options.fornecedores, item.fornecedor_id),
    },
  ];
}

function itemToValues(item?: Patrimonio): Record<string, string> {
  if (!item) return EMPTY_VALUES;
  return {
    numero_patrimonio: item.numero_patrimonio,
    descricao: item.descricao,
    valor: String(item.valor).replace(".", ","),
    observacoes: item.observacoes ?? "",
    tipo_material_id: String(item.tipo_material_id),
    estado_item_id: String(item.estado_item_id),
    ambiente_id: String(item.ambiente_id),
    responsavel_id: String(item.responsavel_id),
    fornecedor_id: item.fornecedor_id ? String(item.fornecedor_id) : "",
  };
}

export default function PatrimoniosScreen() {
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
  } = usePatrimonios();
  const {
    fotos,
    uploading,
    load: loadFotos,
    upload: uploadFoto,
    remove: removeFoto,
    reset: resetFotos,
  } = usePatrimonioFotos();
  const { toast } = useToast();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Patrimonio | null>(null);
  const [formValues, setFormValues] =
    useState<Record<string, string>>(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PatrimonioOptions>(EMPTY_OPTIONS);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Patrimonio | null>(null);

  const loadOptions = useCallback(async () => {
    try {
      const [tiposMaterial, estadosItem, ambientes, responsaveis, fornecedores] =
        await Promise.all([
          tipoMaterialRepository.list(),
          estadoItemRepository.list(),
          ambienteRepository.list(),
          responsavelRepository.list(),
          fornecedorRepository.list(),
        ]);

      setOptions({
        tiposMaterial: toOptions<TipoMaterial>(tiposMaterial),
        estadosItem: toOptions<EstadoItem>(estadosItem),
        ambientes: toOptions<Ambiente>(ambientes),
        responsaveis: toOptions<Responsavel>(responsaveis),
        fornecedores: toOptions<Fornecedor>(fornecedores),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar opções do formulário.";
      toast(message, "error");
    }
  }, [toast]);

  useEffect(() => {
    load();
    loadOptions();
  }, [load, loadOptions]);

  const handleOpenCreate = useCallback(() => {
    loadOptions();
    setEditingItem(null);
    setFormValues(EMPTY_VALUES);
    resetFotos();
    setPendingAssets([]);
    setFormVisible(true);
  }, [loadOptions, resetFotos]);

  const handleOpenEdit = useCallback(
    (item: Patrimonio) => {
      loadOptions();
      setEditingItem(item);
      setFormValues(itemToValues(item));
      resetFotos();
      setPendingAssets([]);
      loadFotos(item.id);
      setFormVisible(true);
    },
    [loadOptions, resetFotos, loadFotos],
  );

  const handleFormChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleUploadAsset = useCallback(
    async (asset: {
      uri: string;
      fileName?: string | null;
      mimeType?: string | null;
    }) => {
      if (!editingItem) {
        setPendingAssets((prev) => [
          ...prev,
          {
            uri: asset.uri,
            ...(asset.fileName != null ? { fileName: asset.fileName } : {}),
            ...(asset.mimeType != null ? { mimeType: asset.mimeType } : {}),
          },
        ]);
        return;
      }
      const ok = await uploadFoto(editingItem.id, {
        uri: asset.uri,
        ...(asset.fileName != null ? { fileName: asset.fileName } : {}),
        ...(asset.mimeType != null ? { mimeType: asset.mimeType } : {}),
      });
      if (ok) load();
    },
    [editingItem, uploadFoto, load],
  );

  const handleRemovePending = useCallback((index: number) => {
    setPendingAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleWebCapture = useCallback(
    (capture: WebCameraCapture) => {
      setCameraVisible(false);
      void handleUploadAsset(capture);
    },
    [handleUploadAsset],
  );

  const handlePickGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast("Permissão de acesso às fotos negada.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    await handleUploadAsset(result.assets[0]);
  }, [toast, handleUploadAsset]);

  const handlePickCamera = useCallback(async () => {
    if (Platform.OS === "web") {
      setCameraVisible(true);
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast("Permissão de acesso à câmera negada.", "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    await handleUploadAsset(result.assets[0]);
  }, [toast, handleUploadAsset]);

  const handleRemoveFoto = useCallback(
    async (fotoId: number) => {
      if (!editingItem) return;
      const ok = await removeFoto(editingItem.id, fotoId);
      if (ok) load();
    },
    [editingItem, removeFoto, load],
  );


  const buildDto = useCallback((): PatrimonioCreateDto | null => {
    const numeroPatrimonio = formValues.numero_patrimonio?.trim();
    const descricao = formValues.descricao?.trim();
    const valor = parseMoney(formValues.valor ?? "");
    const tipoMaterialId = parseRequiredId(formValues.tipo_material_id ?? "");
    const estadoItemId = parseRequiredId(formValues.estado_item_id ?? "");
    const ambienteId = parseRequiredId(formValues.ambiente_id ?? "");
    const responsavelId = parseRequiredId(formValues.responsavel_id ?? "");

    if (!numeroPatrimonio || !descricao) {
      toast("Informe número do patrimônio e descrição.", "error");
      return null;
    }

    if (
      valor === null ||
      tipoMaterialId === null ||
      estadoItemId === null ||
      ambienteId === null ||
      responsavelId === null
    ) {
      toast(
        "Informe valor e selecione tipo, estado, ambiente e responsável.",
        "error",
      );
      return null;
    }

    const dto: PatrimonioCreateDto = {
      numero_patrimonio: numeroPatrimonio,
      descricao,
      valor,
      tipo_material_id: tipoMaterialId,
      estado_item_id: estadoItemId,
      ambiente_id: ambienteId,
      responsavel_id: responsavelId,
    };

    const observacoes = formValues.observacoes?.trim();
    if (observacoes) dto.observacoes = observacoes;

    const fornecedorIdText = formValues.fornecedor_id?.trim();
    if (fornecedorIdText) {
      const fornecedorId = parseRequiredId(fornecedorIdText);
      if (fornecedorId === null) {
        toast("Selecione um fornecedor válido ou deixe sem fornecedor.", "error");
        return null;
      }
      dto.fornecedor_id = fornecedorId;
    }

    return dto;
  }, [formValues, toast]);

  const handleSave = useCallback(async () => {
    const dto = buildDto();
    if (!dto) return;

    setSaving(true);
    try {
      if (editingItem) {
        await update(editingItem.id, dto as PatrimonioUpdateDto);
      } else {
        const created = await create(dto);
        for (const asset of pendingAssets) {
          await uploadFoto(created.id, {
            uri: asset.uri,
            ...(asset.fileName != null ? { fileName: asset.fileName } : {}),
            ...(asset.mimeType != null ? { mimeType: asset.mimeType } : {}),
          });
        }
        if (pendingAssets.length > 0) load();
      }
      setFormVisible(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }, [buildDto, editingItem, create, update, pendingAssets, uploadFoto, load]);

  const handleCancelForm = useCallback(() => {
    setFormVisible(false);
  }, []);

  const handleOpenDelete = useCallback((item: Patrimonio) => {
    setDeletingItem(item);
    setDeleteVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await remove(deletingItem.id);
      setDeleteVisible(false);
    } catch {
      setDeleteVisible(false);
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Patrimônio" : "Novo Patrimônio";
  const formFields = buildFormFields(options);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar patrimônios..."
        testID="patrimonios-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum patrimônio encontrado."
        emptyActionLabel="Criar patrimônio"
        onEmptyAction={handleOpenCreate}
        testID="patrimonios-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={`${item.numero_patrimonio} - ${item.descricao}`}
            metadata={itemToMetadata(item, options)}
            thumbnailUri={
              item.foto_principal_url
                ? publicApiUrl(item.foto_principal_url)
                : null
            }
            loadImages={() =>
              photoRepository
                .listFotos(item.id)
                .then((fotos) => fotos.map((foto) => publicApiUrl(foto.url)))
            }
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`patrimonio-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="patrimonios-fab"
        accessibilityLabel="Criar patrimônio"
      />
      <EntityFormSheet
        visible={formVisible}
        title={formTitle}
        fields={formFields}
        values={formValues}
        onChange={handleFormChange}
        onSave={handleSave}
        onCancel={handleCancelForm}
        saving={saving}
        extraContent={
          <FotosSection
            fotos={fotos}
            pending={pendingAssets}
            uploading={uploading}
            onPickGallery={handlePickGallery}
            onPickCamera={handlePickCamera}
            onRemove={handleRemoveFoto}
            onRemovePending={handleRemovePending}
            resolveUrl={publicApiUrl}
          />
        }
        testID="patrimonios-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.numero_patrimonio ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID="patrimonios-delete-dialog"
      />
      <WebCamera
        key={cameraVisible ? "camera-open" : "camera-closed"}
        visible={cameraVisible}
        onCapture={handleWebCapture}
        onClose={() => setCameraVisible(false)}
        onError={(message) => toast(message, "error")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
