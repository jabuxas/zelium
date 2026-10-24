import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScannerCamera from '../components/ScannerCamera';
import { buscarPorNumero, listarEstados, registrarConferencia } from '../data/repository';
import { numeroDeConteudoQr, type OpcaoEstado, type PatrimonioEscaneado } from '../domain/types';
import { radii, spacing, type AppTheme } from '@/src/shared/theme/tokens';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EscanearScreen() {
  const { colors } = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [numero, setNumero] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [patrimonio, setPatrimonio] = useState<PatrimonioEscaneado | null>(null);
  const [estados, setEstados] = useState<OpcaoEstado[]>([]);
  const [erroEstados, setErroEstados] = useState(false);
  const [estadoSelecionado, setEstadoSelecionado] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ text: string; error: boolean } | null>(null);
  const buscando = useRef(false);
  const gravando = useRef(false);
  const mounted = useRef(true);

  const carregarEstados = useCallback(async () => {
    setErroEstados(false);
    try { const data = await listarEstados(); if (mounted.current) setEstados(data); }
    catch { if (mounted.current) setErroEstados(true); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void carregarEstados();
    return () => { mounted.current = false; };
  }, [carregarEstados]);

  const buscar = useCallback(async (value: string) => {
    const search = value.trim();
    if (!search || buscando.current || gravando.current) return;
    buscando.current = true;
    setCameraAtiva(false); setCarregando(true); setMensagem(null); setPatrimonio(null);
    try {
      const result = await buscarPorNumero(search);
      if (!mounted.current) return;
      const item = result[0];
      if (!item) {
        const text = `Patrimônio "${search}" não encontrado`;
        setMensagem({ text, error: true }); return;
      }
      setPatrimonio(item); setEstadoSelecionado(item.estado_item_id); setObservacao('');
    } catch {
      if (mounted.current) setMensagem({ text: 'Erro ao buscar o patrimônio. Verifique a conexão e tente novamente.', error: true });
    } finally {
      buscando.current = false;
      if (mounted.current) setCarregando(false);
    }
  }, []);

  function aoLerCodigo(data: string) {
    const value = numeroDeConteudoQr(data);
    if (value) void buscar(value);
    else setMensagem({ text: 'QR code não reconhecido como etiqueta Zelium', error: true });
  }

  async function enviarConferencia() {
    if (!patrimonio || gravando.current || !estados.some(estado => estado.id === estadoSelecionado)) return;
    gravando.current = true; setEnviando(true); setMensagem(null);
    try {
      await registrarConferencia(patrimonio.id, { estado_item_id: estadoSelecionado!, ...(observacao.trim() ? { observacao: observacao.trim() } : {}) });
      if (!mounted.current) return;
      setMensagem({ text: 'Conferência registrada com sucesso', error: false });
      setPatrimonio(null); setNumero('');
    } catch {
      if (mounted.current) setMensagem({ text: 'Erro ao registrar a conferência. Seus dados foram mantidos para tentar novamente.', error: true });
    } finally {
      gravando.current = false;
      if (mounted.current) setEnviando(false);
    }
  }

  return <ScrollView testID="escanear-screen" style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled">
    <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <Text variant="headlineSmall" accessibilityRole="header" style={styles.bold}>Inventário em campo</Text>
      <Text style={{ color: colors.onSurfaceVariant }}>Leia a etiqueta ou digite o número do bem para registrar a conferência física.</Text>
      <TextInput mode="outlined" label="Número de patrimônio" accessibilityLabel="Número de patrimônio" autoCapitalize="none" autoCorrect={false}
        value={numero} onChangeText={setNumero} disabled={carregando || enviando} returnKeyType="search" onSubmitEditing={() => { void buscar(numero); }} />
      <Button mode="contained" icon="magnify" contentStyle={styles.buttonContent} disabled={!numero.trim() || carregando || enviando} onPress={() => { void buscar(numero); }}>Buscar patrimônio</Button>
      <Button mode="outlined" icon="qrcode-scan" contentStyle={styles.buttonContent} disabled={carregando || enviando} onPress={() => setCameraAtiva(!cameraAtiva)}>
        {cameraAtiva ? 'Desativar câmera' : 'Ativar câmera'}
      </Button>
      {cameraAtiva && focused && <ScannerCamera onScanned={aoLerCodigo} />}
      {carregando && <ActivityIndicator testID="carregando-indicator" accessibilityLabel="Buscando patrimônio" />}
      {mensagem && <Text accessibilityRole="alert" style={{ color: mensagem.error ? colors.error : colors.success }}>{mensagem.text}</Text>}
      {patrimonio && <Card mode="outlined" style={{ backgroundColor: colors.surface, borderColor: colors.outlineVariant, borderRadius: radii.small }}>
        <Card.Content style={styles.form}>
          <Text variant="titleLarge" style={styles.bold}>{patrimonio.numero_patrimonio}</Text>
          <Text variant="bodyLarge">{patrimonio.descricao}</Text>
          <Text style={{ color: colors.onSurfaceVariant }}>Valor: {BRL.format(patrimonio.valor)}</Text>
          <Text variant="labelLarge">Estado observado</Text>
          {erroEstados ? <>
            <Text style={{ color: colors.error }}>Não foi possível carregar os estados do item.</Text>
            <Button disabled={enviando} onPress={() => { void carregarEstados(); }}>Tentar carregar estados</Button>
          </> : <View style={styles.states}>
            {estados.map(estado => <Chip key={estado.id} style={styles.state} disabled={enviando} selected={estadoSelecionado === estado.id} onPress={() => setEstadoSelecionado(estado.id)}>{estado.nome}</Chip>)}
          </View>}
          <TextInput mode="outlined" label="Observação (opcional)" accessibilityLabel="Observação (opcional)" multiline disabled={enviando}
            value={observacao} onChangeText={setObservacao} />
          <Button mode="contained" contentStyle={styles.buttonContent} loading={enviando} disabled={enviando || erroEstados || !estados.some(estado => estado.id === estadoSelecionado)} onPress={enviarConferencia}>Registrar conferência</Button>
          <Button contentStyle={styles.buttonContent} disabled={enviando} onPress={() => { setPatrimonio(null); setNumero(''); setMensagem(null); }}>Conferir outro patrimônio</Button>
        </Card.Content>
      </Card>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 768, alignSelf: 'center' },
  bold: { fontWeight: '700' }, form: { gap: spacing.sm },
  states: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, buttonContent: { minHeight: 48 },
  state: { minHeight: 44, justifyContent: 'center' },
});
