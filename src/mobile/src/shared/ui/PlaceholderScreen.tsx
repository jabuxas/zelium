import { View, StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

import type { ResourceConfig } from "@/src/shared/domain/registry";

type PlaceholderScreenProps = {
  resource: ResourceConfig;
};

export function PlaceholderScreen({ resource }: PlaceholderScreenProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Card style={styles.card}>
        <Card.Title title={resource.label} />
        <Card.Content>
          <Text variant="bodyLarge" style={styles.label}>
            Rota da API
          </Text>
          <Text variant="bodyMedium" style={styles.mono}>
            {resource.apiPath}
          </Text>

          <View style={styles.spacer} />

          <Text variant="bodyLarge" style={styles.label}>
            Rota mobile
          </Text>
          <Text variant="bodyMedium" style={styles.mono}>
            {resource.mobileRoute}
          </Text>

          <View style={styles.spacer} />

          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Migração pendente
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            Tela a ser migrada do front para React Native.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  label: {
    fontWeight: "600",
  },
  mono: {
    fontFamily: "SpaceMono",
  },
  spacer: {
    height: 12,
  },
  hint: {
    opacity: 0.6,
    marginTop: 4,
  },
});
