import React, { useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardCard } from '../components/DashboardCard';

const ACAO_COLORS: Record<string, string> = {
  criar: '#16a34a',
  atualizar: '#2563eb',
  excluir: '#dc2626',
  login: '#7c3aed',
  logout: '#ea580c',
};

const ACAO_LABELS: Record<string, string> = {
  criar: 'Criação',
  atualizar: 'Atualização',
  excluir: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
};

function getAcaoColor(acao: string): string {
  return ACAO_COLORS[acao.toLowerCase()] ?? '#64748b';
}

function getAcaoLabel(acao: string): string {
  return ACAO_LABELS[acao.toLowerCase()] ?? acao;
}

function formatLogDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stats, logs, loading, error, isRefreshing, load, refresh, retry } = useDashboard();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Sincronizando Inventário Zelium...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: '#f8fafc' }]}>
        <Text variant="titleMedium" style={{ color: theme.colors.error, textAlign: 'center' }}>
          Não foi possível conectar ao servidor do Zelium.
        </Text>
        <Button mode="contained" onPress={retry} style={{ marginTop: 12 }}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      testID="dashboard-scroll"
      style={styles.container}
      contentContainerStyle={{ ...styles.contentContainer, paddingTop: insets.top }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={["#2563eb"]} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.mainTitle}>
          Dashboard
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Visão geral do sistema de gestão patrimonial
        </Text>
      </View>

      <View style={styles.cardsGrid}>
        <DashboardCard 
          title="Patrimônios" 
          value={stats?.totalPatrimonios || 0} 
          subtitle="Total de Patrimônios" 
          icon="cube"
          iconBgColor="#eff6ff"
          iconColor="#2563eb"
        />
        <DashboardCard 
          title="Ambientes" 
          value={stats?.totalAmbientes || 0} 
          subtitle="Ambientes Cadastrados" 
          icon="map-marker"
          iconBgColor="#f0fdf4"
          iconColor="#16a34a"
        />
        <DashboardCard 
          title="Conferentes" 
          value={stats?.totalConferentes || 0} 
          subtitle="Responsáveis Ativos" 
          icon="users"
          iconBgColor="#f5f3ff"
          iconColor="#7c3aed"
        />
        <DashboardCard 
          title="Alertas" 
          value={stats?.alertasAvaria || 0} 
          subtitle="Itens em Manutenção" 
          icon="exclamation-triangle"
          iconBgColor="#fff7ed"
          iconColor="#ea580c"
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Atividades Recentes
        </Text>

        <View style={styles.tableCard}>
          {logs.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Nenhuma movimentação registrada recentemente.</Text>
            </View>
          ) : (
            logs.map((log, index) => (
              <View
                key={log.id}
                style={[
                  styles.tableRow,
                  index === logs.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={[styles.logDot, { backgroundColor: getAcaoColor(log.acao) }]} />
                <View style={styles.logContent}>
                  <Text variant="bodyMedium" style={styles.logText}>
                    <Text style={{ fontWeight: '600', color: getAcaoColor(log.acao) }}>
                      {getAcaoLabel(log.acao)}
                    </Text>
                    {` · ${log.recurso} #${log.recurso_id}`}
                  </Text>
                  {log.usuario ? (
                    <Text variant="bodySmall" style={styles.logUser}>
                      por {log.usuario}
                    </Text>
                  ) : null}
                </View>
                <Text variant="bodySmall" style={styles.logDate}>
                  {formatLogDate(log.criado_em)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  mainTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  logContent: {
    flex: 1,
    paddingRight: 12,
  },
  logText: {
    color: '#334155',
    fontSize: 14,
  },
  logUser: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  logDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
