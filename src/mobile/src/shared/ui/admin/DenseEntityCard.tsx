import { useState } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Card, Text, IconButton, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";
import { EntityDetailDialog } from "./EntityDetailDialog";

export type MetadataItem = {
  label: string;
  value: string;
};

export type DenseEntityCardProps = {
  title: string;
  metadata: MetadataItem[];
  onEdit: () => void;
  onDelete: () => void;
  testID: string;
  thumbnailUri?: string | null;
  loadImages?: (() => Promise<string[]>) | undefined;
};

const MIN_TOUCH_TARGET = 44;

export function DenseEntityCard({
  title,
  metadata,
  onEdit,
  onDelete,
  testID,
  thumbnailUri,
  loadImages,
}: DenseEntityCardProps) {
  const theme = useTheme<AppTheme>();
  const [detailVisible, setDetailVisible] = useState(false);

  const openDetail = () => setDetailVisible(true);

  return (
    <>
      <Card
        testID={testID}
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Card.Content style={styles.content}>
          <Pressable
            onPress={openDetail}
            accessibilityRole="button"
            accessibilityLabel={`Ver detalhes de ${title}`}
            testID={`${testID}-open`}
          >
            <View style={styles.headerRow}>
              {thumbnailUri ? (
                <Image
                  source={{ uri: thumbnailUri }}
                  style={styles.thumbnail}
                  testID={`${testID}-thumbnail`}
                />
              ) : null}
              <Text
                variant="titleMedium"
                style={[styles.title, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            {metadata.map((item) => (
              <View key={item.label} style={styles.metaRow}>
                <Text
                  variant="labelSmall"
                  style={[styles.metaLabel, { color: theme.colors.onSurface }]}
                >
                  {item.label}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.metaValue, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </Pressable>
          <View
            style={styles.actions}
            pointerEvents="box-none"
            testID={`${testID}-actions`}
          >
            <IconButton
              icon="pencil"
              size={20}
              onPress={onEdit}
              accessibilityLabel={`Editar ${title}`}
              testID={`${testID}-edit`}
              style={styles.iconButton}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={onDelete}
              accessibilityLabel={`Excluir ${title}`}
              testID={`${testID}-delete`}
              style={styles.iconButton}
              iconColor={theme.colors.error}
            />
          </View>
        </Card.Content>
      </Card>
      <EntityDetailDialog
        visible={detailVisible}
        title={title}
        metadata={metadata}
        thumbnailUri={thumbnailUri}
        loadImages={loadImages}
        onClose={() => setDetailVisible(false)}
        onEdit={() => {
          setDetailVisible(false);
          onEdit();
        }}
        testID={`${testID}-detail`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  content: {
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingRight: MIN_TOUCH_TARGET * 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontWeight: "600",
  },
  actions: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TOUCH_TARGET,
  },
  iconButton: {
    margin: 0,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
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
});
