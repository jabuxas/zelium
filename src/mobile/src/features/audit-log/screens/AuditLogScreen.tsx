import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Card, Text, Chip, useTheme } from "react-native-paper";
import { useAuditLog } from "../hooks/useAuditLog";
import {
  EntityListScaffold,
  SearchFilterBar,
} from "@/src/shared/ui/admin";
import type { MetadataItem } from "@/src/shared/ui/admin/DenseEntityCard";
import type { AuditLog } from "../domain/types";
import type { AppTheme } from "@/src/shared/theme/tokens";

const ACAO_COLORS: Record<string, string> = {
  criar: "#4CAF50",
  atualizar: "#2196F3",
  excluir: "#F44336",
  login: "#9C27B0",
  logout: "#FF9800",
};

function getAcaoColor(acao: string): string {
  return ACAO_COLORS[acao.toLowerCase()] ?? "#757575";
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function itemToMetadata(item: AuditLog): MetadataItem[] {
  const meta: MetadataItem[] = [
    { label: "Recurso", value: `${item.recurso} #${item.recurso_id}` },
  ];
  if (item.usuario) {
    meta.push({ label: "Usuário", value: item.usuario });
  }
  meta.push({ label: "Data", value: formatTimestamp(item.criado_em) });
  return meta;
}

function AuditLogCard({
  item,
  expanded,
  onPress,
}: {
  item: AuditLog;
  expanded: boolean;
  onPress: () => void;
}) {
  const theme = useTheme<AppTheme>();
  const acaoColor = getAcaoColor(item.acao);

  return (
    <Card
      testID={`audit-log-card-${item.id}`}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <Chip
            mode="flat"
            textStyle={[styles.chipText, { color: "#fff" }]}
            style={[styles.chip, { backgroundColor: acaoColor }]}
            compact
          >
            {item.acao}
          </Chip>
        </View>
        {itemToMetadata(item).map((m) => (
          <View key={m.label} style={styles.metaRow}>
            <Text
              variant="labelSmall"
              style={[styles.metaLabel, { color: theme.colors.onSurface }]}
            >
              {m.label}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.metaValue, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {m.value}
            </Text>
          </View>
        ))}
        {expanded && item.detalhes && (
          <View style={styles.detalhesContainer}>
            <Text
              variant="labelSmall"
              style={[styles.detalhesLabel, { color: theme.colors.onSurface }]}
            >
              Detalhes
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurface }}
            >
              {item.detalhes}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function AuditLogScreen() {
  const {
    filteredData,
    loading,
    error,
    searchQuery,
    load,
    setSearchQuery,
  } = useAuditLog();

  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleCardPress = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <SearchFilterBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por ação, recurso ou usuário..."
        testID="audit-log-search"
      />
      <EntityListScaffold
        loading={loading}
        error={error}
        empty={filteredData.length === 0}
        onRetry={load}
        emptyMessage="Nenhum log de auditoria encontrado."
        testID="audit-log-list"
      >
        {filteredData.map((item) => (
          <AuditLogCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onPress={() => handleCardPress(item.id)}
          />
        ))}
      </EntityListScaffold>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chip: {
    height: 28,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  metaLabel: {
    opacity: 0.6,
    marginRight: 8,
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
  },
  detalhesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  detalhesLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
});