import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { useAuditLog } from '../hooks/useAuditLog';
import { AuditEventCard } from '../components/AuditEventCard';
import { AuditFilters } from '../components/AuditFilters';
import { spacing, type AppTheme } from '@/src/shared/theme/tokens';

export default function AuditLogScreen() {
  const filters = useAuditLog();
  const { filteredData, loading, error, page, pages, total, setPage, load } = filters;
  const { colors } = useTheme<AppTheme>();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return <ScrollView testID="audit-log-list" style={{ backgroundColor: colors.background }} keyboardShouldPersistTaps="handled">
    <View style={styles.content}>
      <Text variant="titleLarge" accessibilityRole="header">Histórico da organização</Text>
      <Text style={{ color: colors.onSurfaceVariant }}>Consulte movimentações, autores e alterações dos registros.</Text>
      <AuditFilters filters={filters} />
      {loading ? <View accessibilityLabel="Carregando" style={styles.status}><ActivityIndicator /><Text>Carregando histórico...</Text></View>
        : error ? <View style={styles.status}>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>
          <Button mode="contained" onPress={() => { void load(); }}>Tentar novamente</Button>
        </View> : filteredData.length === 0 ? <Text>Nenhum evento encontrado para estes filtros.</Text>
          : filteredData.map(item => <AuditEventCard key={item.id} item={item} expanded={expandedId === item.id}
            onPress={() => setExpandedId(current => current === item.id ? null : item.id)} />)}
      <Text accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }}>Página {page} de {Math.max(1, pages)} · {total} eventos</Text>
      <View style={styles.pagination}>
        <Button mode="outlined" disabled={loading || page <= 1} onPress={() => setPage(page - 1)}>Anterior</Button>
        <Button mode="outlined" disabled={loading || page >= pages} onPress={() => setPage(page + 1)}>Próxima</Button>
      </View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 768, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  status: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
});
