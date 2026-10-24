import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radii, spacing, type AppTheme } from '@/src/shared/theme/tokens';

export function DashboardCard({ value, label, warning = false }: { value: number; label: string; warning?: boolean }) {
  const { colors } = useTheme<AppTheme>();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
      <Text variant="headlineMedium" style={[styles.value, { color: warning ? colors.warning : colors.onSurface }]}>{value}</Text>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '46%', flexGrow: 1, padding: spacing.md, gap: spacing.xxs, borderRadius: radii.small, borderWidth: 1 },
  value: { fontWeight: '700' },
});
