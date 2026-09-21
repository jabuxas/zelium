import { View, StyleSheet, ScrollView } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";

export type EntityListScaffoldProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  children: React.ReactNode;
  testID?: string;
};

export function EntityListScaffold({
  loading,
  error,
  empty,
  onRetry,
  emptyMessage = "Nenhum item encontrado.",
  emptyActionLabel,
  onEmptyAction,
  children,
  testID,
}: EntityListScaffoldProps) {
  const theme = useTheme<AppTheme>();

  if (loading) {
    return (
      <View
        testID={testID ? `${testID}-loading` : "entity-list-loading"}
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Carregando"
      >
        <ActivityIndicator size="large" animating />
        <Text
          variant="bodyMedium"
          style={[styles.loadingText, { color: theme.colors.onSurface }]}
        >
          Carregando...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        testID={testID ? `${testID}-error` : "entity-list-error"}
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Erro ao carregar"
      >
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.error }}
        >
          {error}
        </Text>
        {onRetry ? (
          <Button
            mode="contained"
            onPress={onRetry}
            style={styles.retryButton}
            testID={testID ? `${testID}-retry` : "entity-list-retry"}
            accessibilityLabel="Tentar novamente"
          >
            Tentar novamente
          </Button>
        ) : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View
        testID={testID ? `${testID}-empty` : "entity-list-empty"}
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Lista vazia"
      >
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: theme.colors.onSurface }]}
        >
          {emptyMessage}
        </Text>
        {onEmptyAction && emptyActionLabel ? (
          <Button
            mode="outlined"
            onPress={onEmptyAction}
            style={styles.emptyAction}
            testID={testID ? `${testID}-empty-action` : "entity-list-empty-action"}
            accessibilityLabel={emptyActionLabel}
          >
            {emptyActionLabel}
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={[styles.list, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.listContent}
      accessibilityLabel="Lista de itens"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    marginTop: 4,
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 12,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
  },
  emptyAction: {
    marginTop: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
});