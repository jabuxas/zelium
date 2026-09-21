import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FAB } from "react-native-paper";
import * as Location from "expo-location";
import { useAmbientes } from "../hooks/useAmbientes";
import {
  LocalizacaoSection,
  type LocalizacaoValue,
} from "../components/LocalizacaoSection";
import { useResponsaveis } from "@/src/features/responsaveis/hooks/useResponsaveis";
import { useToast } from "@/src/shared/ui/toast";
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
import type { Responsavel } from "@/src/features/responsaveis/domain/types";
import type { Ambiente, AmbienteCreateDto, AmbienteUpdateDto } from "../domain/types";
import { DependencyConflictError } from "@/src/shared/api/errors";

const EMPTY_VALUES = {
  nome: "",
  bloco: "",
  andar: "",
  responsavel_id: "",
};

function buildFormFields(responsaveis: SelectOption[]): FormField[] {
  return [
    {
      name: "nome",
      label: "Nome do ambiente",
      placeholder: "Ex.: Laboratório de informática",
    },
    {
      name: "bloco",
      label: "Bloco (opcional)",
      placeholder: "Ex.: Bloco A",
    },
    {
      name: "andar",
      label: "Andar (opcional)",
      placeholder: "Ex.: 2º andar",
    },
    {
      name: "responsavel_id",
      label: "Responsável",
      placeholder: "Selecione o responsável",
      type: "select",
      options: responsaveis,
    },
  ];
}

function parseRequiredId(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toOptions(items: Responsavel[]): SelectOption[] {
  return items.map((item) => ({ label: item.nome, value: String(item.id) }));
}

function optionLabel(options: SelectOption[], id: number | null | undefined): string {
  if (!id) return "-";
  return options.find((option) => option.value === String(id))?.label ?? `#${id}`;
}

function formatEndereco(addr: Location.LocationGeocodedAddress): string {
  const bairro = addr.district ?? addr.subregion;
  const parts = [addr.street, bairro, addr.city, addr.region].filter(
    (part): part is string => Boolean(part),
  );
  return [...new Set(parts)].join(", ");
}

function formatLocalizacao(item: Ambiente): string {
  if (item.latitude == null || item.longitude == null) return "Não definida";
  return `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`;
}

function itemToMetadata(
  item: Ambiente,
  responsaveis: SelectOption[],
): MetadataItem[] {
  const temCoords = item.latitude != null && item.longitude != null;
  const metadata: MetadataItem[] = [
    { label: "Bloco", value: item.bloco ?? "-" },
    { label: "Andar", value: item.andar ?? "-" },
    { label: "Responsável", value: optionLabel(responsaveis, item.responsavel_id) },
    { label: "Localização", value: formatLocalizacao(item) },
  ];

  if (Platform.OS === "web" && temCoords) {
    metadata.push({ label: "Endereço", value: "Indisponível na web" });
  }

  return metadata;
}

function itemToValues(item?: Ambiente): Record<string, string> {
  if (!item) return EMPTY_VALUES;
  return {
    nome: item.nome,
    bloco: item.bloco ?? "",
    andar: item.andar ?? "",
    responsavel_id: String(item.responsavel_id),
  };
}

export default function AmbientesScreen() {
  const {
    filteredData,
    loading,
    error,
    searchQuery,
    load,
    create,
    update,
    remove,
    setLocalizacao,
    clearLocalizacao,
    setSearchQuery,
  } = useAmbientes();
  const { data: responsaveisData, load: loadResponsaveis } = useResponsaveis();
  const { toast } = useToast();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Ambiente | null>(null);
  const [formValues, setFormValues] =
    useState<Record<string, string>>(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);
  const [formLoc, setFormLoc] = useState<LocalizacaoValue>(null);
  const [locObservacao, setLocObservacao] = useState("");
  const [capturingLoc, setCapturingLoc] = useState(false);
  const [locationDirty, setLocationDirty] = useState(false);
  const responsaveis = useMemo(
    () => toOptions(responsaveisData),
    [responsaveisData],
  );

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Ambiente | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
    loadResponsaveis();
  }, [load, loadResponsaveis]);

  const handleOpenCreate = useCallback(() => {
    loadResponsaveis();
    setEditingItem(null);
    setFormValues(EMPTY_VALUES);
    setFormLoc(null);
    setLocObservacao("");
    setLocationDirty(false);
    setFormVisible(true);
  }, [loadResponsaveis]);

  const handleOpenEdit = useCallback(
    (item: Ambiente) => {
      loadResponsaveis();
      setEditingItem(item);
      setFormValues(itemToValues(item));
      setFormLoc(
        item.latitude != null && item.longitude != null
          ? {
              latitude: item.latitude,
              longitude: item.longitude,
              ...(item.precisao_metros != null
                ? { precisao_metros: item.precisao_metros }
                : {}),
            }
          : null,
      );
      setLocObservacao(item.localizacao_observacao ?? "");
      setLocationDirty(false);
      setFormVisible(true);
    },
    [loadResponsaveis],
  );

  const handleFormChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setCapturingLoc(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast(
          "Permissão de localização negada. Habilite nas configurações.",
          "error",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setFormLoc({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        ...(pos.coords.accuracy != null
          ? { precisao_metros: pos.coords.accuracy }
          : {}),
      });
      setLocationDirty(true);

      if (Platform.OS !== "web") {
        try {
          const [addr] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const endereco = addr ? formatEndereco(addr) : "";
          if (endereco) {
            setLocObservacao((prev) => (prev.trim() ? prev : endereco));
          }
        } catch {
        }
      }
    } catch {
      toast("Não foi possível obter a localização atual.", "error");
    } finally {
      setCapturingLoc(false);
    }
  }, [toast]);

  const handleClearLocation = useCallback(() => {
    setFormLoc(null);
    setLocObservacao("");
    setLocationDirty(true);
  }, []);

  const buildDto = useCallback((): AmbienteCreateDto | null => {
    const nome = formValues.nome?.trim();
    const responsavelId = parseRequiredId(formValues.responsavel_id ?? "");

    if (!nome) {
      toast("Informe o nome do ambiente.", "error");
      return null;
    }

    if (responsavelId === null) {
      toast("Selecione um responsável.", "error");
      return null;
    }

    const dto: AmbienteCreateDto = {
      nome,
      responsavel_id: responsavelId,
    };

    const bloco = formValues.bloco?.trim();
    const andar = formValues.andar?.trim();
    if (bloco) dto.bloco = bloco;
    if (andar) dto.andar = andar;

    return dto;
  }, [formValues, toast]);

  const handleSave = useCallback(async () => {
    const dto = buildDto();
    if (!dto) return;

    const observacao = locObservacao.trim();

    setSaving(true);
    try {
      if (editingItem) {
        await update(editingItem.id, dto as AmbienteUpdateDto);
        if (locationDirty) {
          if (formLoc) {
            await setLocalizacao(editingItem.id, {
              latitude: formLoc.latitude,
              longitude: formLoc.longitude,
              ...(formLoc.precisao_metros != null
                ? { precisao_metros: formLoc.precisao_metros }
                : {}),
              ...(observacao ? { localizacao_observacao: observacao } : {}),
            });
          } else {
            await clearLocalizacao(editingItem.id);
          }
        }
      } else {
        if (formLoc) {
          dto.latitude = formLoc.latitude;
          dto.longitude = formLoc.longitude;
          if (formLoc.precisao_metros != null) {
            dto.precisao_metros = formLoc.precisao_metros;
          }
          if (observacao) dto.localizacao_observacao = observacao;
        }
        await create(dto);
      }
      setFormVisible(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }, [
    buildDto,
    editingItem,
    create,
    update,
    formLoc,
    locObservacao,
    locationDirty,
    setLocalizacao,
    clearLocalizacao,
  ]);

  const handleCancelForm = useCallback(() => {
    setFormVisible(false);
  }, []);

  const handleOpenDelete = useCallback((item: Ambiente) => {
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
          err.message || "Este ambiente está em uso e não pode ser excluído.",
        );
      } else {
        setDeleteVisible(false);
      }
    }
  }, [deletingItem, remove]);

  const handleCancelDelete = useCallback(() => {
    setDeleteVisible(false);
  }, []);

  const formTitle = editingItem ? "Editar Ambiente" : "Novo Ambiente";
  const formFields = buildFormFields(responsaveis);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar ambientes..."
        testID="ambientes-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0 && !searchQuery.trim()}
        onRetry={load}
        emptyMessage="Nenhum ambiente encontrado."
        emptyActionLabel="Criar ambiente"
        onEmptyAction={handleOpenCreate}
        testID="ambientes-list"
      >
        {filteredData.map((item) => (
          <DenseEntityCard
            key={item.id}
            title={item.nome}
            metadata={itemToMetadata(item, responsaveis)}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleOpenDelete(item)}
            testID={`ambiente-card-${item.id}`}
          />
        ))}
      </EntityListScaffold>
      <FAB
        icon="plus"
        onPress={handleOpenCreate}
        style={styles.fab}
        testID="ambientes-fab"
        accessibilityLabel="Criar ambiente"
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
          <LocalizacaoSection
            value={formLoc}
            observacao={locObservacao}
            onChangeObservacao={setLocObservacao}
            onUseCurrent={handleUseCurrentLocation}
            onClear={handleClearLocation}
            capturing={capturingLoc}
            disabled={saving}
          />
        }
        testID="ambientes-form"
      />
      <ConfirmDeleteDialog
        visible={deleteVisible}
        itemName={deletingItem?.nome ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        error={deleteError}
        testID="ambientes-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
