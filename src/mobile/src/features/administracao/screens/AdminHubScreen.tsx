import { ScrollView, View, StyleSheet } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { router, type RelativePathString } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RESOURCE_REGISTRY, type ResourceKey } from "@/src/shared/domain/registry";
import { useAuth } from "@/src/shared/auth/AuthContext";
import { spacing, radii, type AppTheme } from '@/src/shared/theme/tokens';

const ADMIN_CARDS: ResourceKey[] = [
  "conferentes",
  "estados-item",
  "fornecedores",
  "responsaveis",
  "tipos-material",
];

const PAPEL_LABEL: Record<string, string> = {
  gestor: "Gestor",
  responsavel: "Responsável",
  conferente: "Conferente",
};

export default function AdminHubScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { usuario, logout } = useAuth();

  // Administração de cadastros é exclusiva do gestor
  const podeAdministrar = usuario?.papel === "gestor";

  return (
    <View
      testID="admin-hub-container"
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <ScrollView testID="admin-hub-scroll" contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
      <Text variant="headlineSmall" accessibilityRole="header" style={styles.heading}>
        Conta e cadastros
      </Text>

      {usuario && (
        <Card mode="outlined" style={[styles.profile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Card.Content>
            <Text variant="titleMedium">{usuario.nome}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{usuario.email}</Text>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{PAPEL_LABEL[usuario.papel] ?? usuario.papel}</Text>
          </Card.Content>
        </Card>
      )}

      <Button mode="contained-tonal" icon="history" contentStyle={styles.buttonContent} style={styles.history}
        onPress={() => router.push('/audit-log')}>Histórico da organização</Button>

      {podeAdministrar ? (
        <View style={styles.grid}>
          <Text variant="titleMedium" accessibilityRole="header">Cadastros da organização</Text>
          {ADMIN_CARDS.map((key) => {
            const resource = RESOURCE_REGISTRY[key];
            return (
              <Card
                key={key}
                mode="outlined"
                accessibilityLabel={`Abrir ${resource.label}`}
                style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                onPress={() => router.push(`/${key}` as RelativePathString)}
              >
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                    {resource.label}
                  </Text>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      ) : (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Os cadastros da organização são gerenciados pelo gestor. No
          aplicativo você acompanha patrimônios, ambientes e
          conferências em campo.
        </Text>
      )}

      <Button
        mode="outlined"
        contentStyle={styles.buttonContent}
        icon="logout"
        onPress={logout}
        style={[styles.logout, { borderColor: theme.colors.error }]}
        textColor={theme.colors.error}
      >
        Sair da conta
      </Button>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  content: { width: '100%', maxWidth: 768, alignSelf: 'center' },
  heading: {
    fontWeight: "700",
    marginBottom: 16,
  },
  profile: {
    marginBottom: 16,
    borderRadius: 12,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonContent: { minHeight: 48 },
  history: { marginBottom: spacing.lg, borderRadius: radii.small },
  logout: {
    marginTop: spacing.lg,
    borderRadius: radii.small,
  },
});
