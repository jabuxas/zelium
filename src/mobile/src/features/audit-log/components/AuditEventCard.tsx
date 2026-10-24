import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import type { AuditLog } from '../domain/types';
import { auditAction, auditDate, auditField, auditSummary, auditValue } from '../domain/presentation';
import { spacing, type AppTheme } from '@/src/shared/theme/tokens';

function legacyText(details?: string): string | null {
  if (!details) return null;
  try { JSON.parse(details); return null; } catch { return details; }
}

export function AuditEventCard({ item, expanded, onPress }: { item: AuditLog; expanded: boolean; onPress: () => void }) {
  const { colors } = useTheme<AppTheme>();
  const details = legacyText(item.detalhes);
  return (
    <Card mode="outlined" testID={`audit-log-card-${item.id}`} onPress={onPress}
      accessibilityLabel={`${auditAction(item.acao)}: ${auditSummary(item)}`} accessibilityState={{ expanded }}
      style={{ backgroundColor: colors.surface, borderColor: colors.outlineVariant }}>
      <Card.Content style={styles.content}>
        <Text variant="labelMedium" style={{ color: colors.primary }}>{auditAction(item.acao)}</Text>
        <Text variant="titleMedium">{auditSummary(item)}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.usuario ?? 'Sistema'}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{auditDate(item.criado_em)}</Text>
        <Text variant="labelMedium" style={{ color: colors.primary }}>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</Text>
        {expanded && <View style={[styles.details, { borderColor: colors.outlineVariant }]}>
          {item.alteracoes?.map((change, index) => <View key={`${change.campo}-${index}`} style={styles.change}>
            <Text variant="labelLarge">{auditField(change.campo)}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Antes: {auditValue(change.campo, change.anterior)}</Text>
            <Text variant="bodyMedium">Depois: {auditValue(change.campo, change.novo)}</Text>
          </View>)}
          {details && <Text>{details}</Text>}
          {!item.alteracoes?.length && !details && <Text>Nenhum campo detalhado neste evento.</Text>}
        </View>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxs },
  details: { borderTopWidth: 1, marginTop: spacing.xs, paddingTop: spacing.sm, gap: spacing.sm },
  change: { gap: spacing.xxs },
});
