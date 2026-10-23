import { View, StyleSheet } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { router, type RelativePathString } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RESOURCE_REGISTRY, type ResourceKey } from "@/src/shared/domain/registry";
import { useAuth } from "@/src/shared/auth/AuthContext";

const ADMIN_CARDS: ResourceKey[] = [
  "audit-log",
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
  const theme = useTheme();
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
      <Text variant="headlineSmall" style={styles.heading}>
        Administração
      </Text>

      {usuario && (
        <Card style={[styles.profile, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium">{usuario.nome}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              {usuario.email} · {PAPEL_LABEL[usuario.papel] ?? usuario.papel}
            </Text>
          </Card.Content>
        </Card>
      )}

      {podeAdministrar ? (
        <View style={styles.grid}>
          {ADMIN_CARDS.map((key) => {
            const resource = RESOURCE_REGISTRY[key];
            return (
              <Card
                key={key}
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
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
        <Text variant="bodyMedium" style={styles.restricted}>
          Os cadastros da organização são gerenciados pelo gestor. No
          aplicativo você acompanha patrimônios, ambientes, solicitações e
          conferências em campo.
        </Text>
      )}

      <Button
        mode="outlined"
        icon="logout"
        onPress={logout}
        style={styles.logout}
        textColor={theme.colors.error}
      >
        Sair da conta
      </Button>
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
    paddingVertical: 4,
  },
  restricted: {
    opacity: 0.7,
    lineHeight: 20,
  },
  logout: {
    marginTop: 24,
    borderColor: "#fca5a5",
  },
});
