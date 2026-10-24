import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { ActivityIndicator, Text, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardCard } from '../components/DashboardCard';
import { auditAction, auditDate, auditSummary } from '@/src/features/audit-log/domain/presentation';
import { radii, spacing, type AppTheme } from '@/src/shared/theme/tokens';

export default function DashboardScreen() {
  const { colors } = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { stats, logs, loading, error, atividadesIndisponiveis, dadosEmCache, isRefreshing, load, refresh, retry } = useDashboard();

  useEffect(() => { void load(); }, [load]);

  if (loading || error) return (
    <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {loading ? <>
        <ActivityIndicator accessibilityLabel="Carregando inventário" />
        <Text>Atualizando seu inventário...</Text>
      </> : <>
        <Text accessibilityRole="alert" style={{ color: colors.error }}>Não foi possível carregar o inventário.</Text>
        <Button mode="contained" onPress={retry}>Tentar novamente</Button>
      </>}
    </View>
  );

  return (
    <ScrollView
      testID="dashboard-scroll"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
    >
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text variant="headlineMedium" accessibilityRole="header" style={styles.bold}>Inventário</Text>
          <Text style={{ color: colors.onSurfaceVariant }}>Localize, confira e acompanhe os bens da organização.</Text>
        </View>
        <View style={styles.actions}>
          <Button mode="contained" icon="qrcode-scan" contentStyle={styles.buttonContent} style={styles.button} onPress={() => router.push('/escanear')}>Conferir patrimônio</Button>
          <Button mode="outlined" icon="magnify" contentStyle={styles.buttonContent} style={styles.button} onPress={() => router.push('/patrimonios')}>Buscar patrimônio</Button>
        </View>
        {dadosEmCache && <Text accessibilityRole="alert" style={{ color: colors.warning }}>Sem atualização do servidor. Mostrando indicadores salvos desta conta.</Text>}
        <View style={styles.grid}>
          <DashboardCard value={stats?.totalPatrimonios ?? 0} label="Total de Patrimônios" />
          <DashboardCard value={stats?.totalAmbientes ?? 0} label="Ambientes cadastrados" />
          <DashboardCard value={stats?.totalConferentes ?? 0} label="Conferentes cadastrados" />
          <DashboardCard value={stats?.alertasAvaria ?? 0} label="Patrimônios com avaria" warning />
        </View>
        <View style={styles.section}>
          <Text variant="titleLarge" accessibilityRole="header" style={styles.bold}>Atividades recentes</Text>
          <Text style={{ color: colors.onSurfaceVariant }}>Movimentações do inventário e conferências.</Text>
        </View>
        <View style={[styles.events, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          {atividadesIndisponiveis || logs.length === 0 ? (
            <Text style={[styles.event, { color: colors.onSurfaceVariant }]}>{atividadesIndisponiveis
              ? 'Atividades indisponíveis no momento. Os indicadores continuam disponíveis.'
              : 'Nenhuma movimentação registrada recentemente.'}</Text>
          ) : logs.map((log, index) => (
            <View key={log.id} style={[styles.event, { borderTopWidth: index === 0 ? 0 : 1, borderColor: colors.outlineVariant }]}>
              <Text variant="labelMedium" style={{ color: colors.primary }}>{auditAction(log.acao)}</Text>
              <Text variant="bodyMedium" style={styles.bold}>{auditSummary(log)}</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{log.usuario ?? 'Sistema'} · {auditDate(log.criado_em)}</Text>
            </View>
          ))}
        </View>
        <Button mode="text" onPress={() => router.push('/audit-log')}>Ver histórico</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 768, alignSelf: 'center', padding: spacing.md, gap: spacing.md },
  heading: { gap: spacing.xs, marginTop: spacing.xs },
  bold: { fontWeight: '700' },
  actions: { gap: spacing.xs },
  button: { borderRadius: radii.small },
  buttonContent: { minHeight: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { marginTop: spacing.xs, gap: spacing.xxs },
  events: { borderRadius: radii.small, borderWidth: 1, overflow: 'hidden' },
  event: { padding: spacing.md, gap: spacing.xxs },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
});
