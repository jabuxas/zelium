import { Platform, View, StyleSheet } from "react-native";
import { Text, TextInput, Button, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";

export type LocalizacaoValue = {
  latitude: number;
  longitude: number;
  precisao_metros?: number;
} | null;

export type LocalizacaoSectionProps = {
  value: LocalizacaoValue;
  observacao: string;
  onChangeObservacao: (text: string) => void;
  onUseCurrent: () => void;
  onClear: () => void;
  capturing?: boolean;
  disabled?: boolean;
  testID?: string;
};

function formatCoords(value: LocalizacaoValue): string {
  if (!value) return "Não definida";
  const coords = `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`;
  if (value.precisao_metros == null) return coords;
  return `${coords} (±${Math.round(value.precisao_metros)} m)`;
}

export function LocalizacaoSection({
  value,
  observacao,
  onChangeObservacao,
  onUseCurrent,
  onClear,
  capturing = false,
  disabled = false,
  testID = "ambiente-localizacao",
}: LocalizacaoSectionProps) {
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.container} testID={testID}>
      <Text
        variant="titleSmall"
        style={[styles.heading, { color: theme.colors.onSurface }]}
      >
        Localização
      </Text>
      <Text
        variant="bodySmall"
        style={[styles.coords, { color: theme.colors.onSurfaceVariant }]}
        testID={`${testID}-coords`}
      >
        {formatCoords(value)}
      </Text>

      {Platform.OS === "web" ? (
        <Text
          variant="bodySmall"
          style={[styles.aviso, { color: theme.colors.onSurfaceVariant }]}
          testID={`${testID}-aviso-web`}
        >
          Endereço aproximado indisponível na web; apenas as coordenadas são
          registradas. Use o app no celular para preencher automaticamente.
        </Text>
      ) : null}

      <TextInput
        label="Observação (opcional)"
        placeholder="Ex.: Entrada principal do laboratório"
        value={observacao}
        onChangeText={onChangeObservacao}
        mode="outlined"
        style={styles.input}
        disabled={disabled}
        testID={`${testID}-observacao`}
      />

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="crosshairs-gps"
          onPress={onUseCurrent}
          loading={capturing}
          disabled={disabled || capturing}
          style={styles.button}
          testID={`${testID}-use-current`}
        >
          Usar localização atual
        </Button>
        {value ? (
          <Button
            mode="outlined"
            icon="map-marker-off"
            onPress={onClear}
            disabled={disabled || capturing}
            style={styles.button}
            testID={`${testID}-clear`}
          >
            Limpar
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  heading: {
    fontWeight: "600",
    marginBottom: 4,
  },
  coords: {
    marginBottom: 12,
  },
  aviso: {
    fontStyle: "italic",
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  actions: {
    gap: 8,
  },
  button: {
    borderRadius: 8,
  },
});
