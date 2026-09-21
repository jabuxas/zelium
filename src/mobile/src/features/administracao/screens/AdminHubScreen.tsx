import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { router, type RelativePathString } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RESOURCE_REGISTRY, type ResourceKey } from "@/src/shared/domain/registry";

const ADMIN_CARDS: ResourceKey[] = [
  "audit-log",
  "conferentes",
  "estados-item",
  "fornecedores",
  "responsaveis",
  "tipos-material",
];

export default function AdminHubScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    paddingVertical: 4,
  },
});
