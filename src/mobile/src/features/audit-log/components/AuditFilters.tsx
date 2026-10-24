import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { useAuth } from '@/src/shared/auth/AuthContext';
import { spacing } from '@/src/shared/theme/tokens';
import { auditActions, auditResources } from '../domain/presentation';
import type { useAuditLog } from '../hooks/useAuditLog';

const operationalResources = ['patrimonio', 'ambiente', 'solicitacao', 'conferencia', 'patrimonio_fotos'];

export function AuditFilters({ filters }: { filters: ReturnType<typeof useAuditLog> }) {
  const [expanded, setExpanded] = useState(false);
  const { usuario } = useAuth();
  const resources = Object.entries(auditResources).filter(([key]) => key !== 'material' && (!filters.operacional || operationalResources.includes(key)));

  return <View style={styles.content}>
    <TextInput mode="outlined" label="Nome ou número do bem" accessibilityLabel="Nome ou número do bem"
      value={filters.searchQuery} onChangeText={filters.setSearchQuery} maxLength={200} testID="audit-log-search"
      returnKeyType="search" onSubmitEditing={filters.applyFilters} />
    <View style={styles.row}>
      <Button mode="contained" onPress={filters.applyFilters} disabled={filters.loading}>Buscar</Button>
      <Button mode="outlined" onPress={() => setExpanded(!expanded)} accessibilityState={{ expanded }}>Filtros</Button>
      <Button onPress={filters.clearFilters}>Limpar</Button>
    </View>
    {expanded && <View style={styles.content}>
      {usuario?.papel === 'gestor' && <View style={styles.row}>
        <Chip selected={filters.operacional} onPress={() => { filters.setOperacional(true); filters.setFilterRecurso(''); }}>Operacional</Chip>
        <Chip selected={!filters.operacional} onPress={() => filters.setOperacional(false)}>Incluir administração</Chip>
      </View>}
      <Text variant="labelLarge">Ação</Text>
      <View style={styles.row}>
        <Chip selected={!filters.filterAcao} onPress={() => filters.setFilterAcao('')}>Todas as ações</Chip>
        {Object.entries(auditActions).map(([value, label]) => <Chip key={value} selected={filters.filterAcao === value} onPress={() => filters.setFilterAcao(value)}>{label}</Chip>)}
      </View>
      <Text variant="labelLarge">Registro</Text>
      <View style={styles.row}>
        <Chip selected={!filters.filterRecurso} onPress={() => filters.setFilterRecurso('')}>Todos os registros</Chip>
        {resources.map(([value, label]) => <Chip key={value} selected={filters.filterRecurso === value} onPress={() => filters.setFilterRecurso(value)}>{label}</Chip>)}
      </View>
      <TextInput mode="outlined" label="Autor" accessibilityLabel="Autor" value={filters.filterUsuario} onChangeText={filters.setFilterUsuario} maxLength={200} />
      <TextInput mode="outlined" label="De (AAAA-MM-DD)" accessibilityLabel="De (AAAA-MM-DD)" value={filters.de} onChangeText={filters.setDe} maxLength={10} placeholder="2026-01-01" />
      <TextInput mode="outlined" label="Até (AAAA-MM-DD)" accessibilityLabel="Até (AAAA-MM-DD)" value={filters.ate} onChangeText={filters.setAte} maxLength={10} placeholder="2026-12-31" />
      <Button mode="contained" disabled={filters.loading} onPress={() => { filters.applyFilters(); setExpanded(false); }}>Aplicar filtros</Button>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
});
