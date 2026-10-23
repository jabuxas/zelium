import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/src/shared/ui/toast";
import {
  buscarPorNumero,
  listarEstados,
  registrarConferencia,
} from "../data/repository";
import {
  numeroDeConteudoQr,
  type OpcaoEstado,
  type PatrimonioEscaneado,
} from "../domain/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function EscanearScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const [escaneando, setEscaneando] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [patrimonio, setPatrimonio] = useState<PatrimonioEscaneado | null>(null);
  const [estados, setEstados] = useState<OpcaoEstado[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarEstados().then(setEstados).catch(() => undefined);
  }, []);

  const aoLerCodigo = useCallback(
    ({ data }: { data: string }) => {
      if (!escaneando || !data) return;

      const numero = numeroDeConteudoQr(data);
      if (!numero) {
        toast("QR code não reconhecido como etiqueta Zelium", "error");
        return;
      }

      setEscaneando(false);
      setCarregando(true);
      buscarPorNumero(numero)
        .then((resultado) => {
          if (resultado.length === 0) {
            toast(`Patrimônio "${numero}" não encontrado`, "error");
            setEscaneando(true);
            return;
          }
          setPatrimonio(resultado[0]);
          setEstadoSelecionado(resultado[0].estado_item_id);
          setObservacao("");
        })
        .catch(() => {
          toast("Erro ao buscar o patrimônio", "error");
          setEscaneando(true);
        })
        .finally(() => setCarregando(false));
    },
    [escaneando, toast],
  );

  async function enviarConferencia() {
    if (!patrimonio) return;
    setEnviando(true);
    try {
      const payload: { estado_item_id?: number; observacao?: string } = {};
      if (estadoSelecionado !== null) {
        payload.estado_item_id = estadoSelecionado;
      }
      const obs = observacao.trim();
      if (obs) {
        payload.observacao = obs;
      }
      await registrarConferencia(patrimonio.id, payload);
      toast("Conferência registrada com sucesso", "success");
      setPatrimonio(null);
      setEscaneando(true);
    } catch {
      toast("Erro ao registrar a conferência", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View
      testID="escanear-screen"
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <Text variant="headlineSmall" style={styles.heading}>
        Inventário em campo
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Escaneie a etiqueta QR Code de um patrimônio para consultar e registrar
        a conferência física.
      </Text>

      {escaneando && (
        <View style={styles.cameraWrapper}>
          <CameraView
            testID="camera-view"
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={aoLerCodigo}
          />
          <Text style={styles.cameraHint}>
            Aponte a câmera para a etiqueta do bem
          </Text>
        </View>
      )}

      {carregando && (
        <ActivityIndicator
          testID="carregando-indicator"
          style={{ marginTop: 24 }}
        />
      )}

      {patrimonio && (
        <ScrollView style={styles.resultado}>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={{ fontWeight: "700" }}>
                {patrimonio.numero_patrimonio}
              </Text>
              <Text variant="bodyLarge" style={{ marginTop: 4 }}>
                {patrimonio.descricao}
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 4, opacity: 0.7 }}>
                Valor: {BRL.format(patrimonio.valor)}
              </Text>

              <View style={styles.chipRow}>
                {estados.map((estado) => (
                  <Chip
                    key={estado.id}
                    selected={estadoSelecionado === estado.id}
                    onPress={() => setEstadoSelecionado(estado.id)}
                    style={styles.chip}
                  >
                    {estado.nome}
                  </Chip>
                ))}
              </View>

              <TextInput
                mode="outlined"
                label="Observação (opcional)"
                accessibilityLabel="Observação (opcional)"
                multiline
                value={observacao}
                onChangeText={setObservacao}
                style={styles.observacao}
              />

              <Button
                mode="contained"
                onPress={enviarConferencia}
                loading={enviando}
                disabled={enviando || estadoSelecionado === null}
                style={styles.botao}
              >
                Registrar conferência
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  setPatrimonio(null);
                  setEscaneando(true);
                }}
              >
                Escanear outro patrimônio
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 16,
  },
  cameraWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    width: "100%",
    height: 320,
  },
  cameraHint: {
    color: "#fff",
    textAlign: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  resultado: {
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    padding: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 20,
  },
  observacao: {
    marginTop: 12,
  },
  botao: {
    marginTop: 16,
    paddingVertical: 4,
  },
});
