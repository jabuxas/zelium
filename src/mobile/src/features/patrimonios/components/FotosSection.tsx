import { useState } from "react";
import { View, Image, ScrollView, Pressable, StyleSheet } from "react-native";
import { Text, Button, IconButton, Portal, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";
import type { PatrimonioFoto } from "../domain/types";

export type PendingFoto = {
  uri: string;
};

export type FotosSectionProps = {
  fotos: PatrimonioFoto[];
  pending?: PendingFoto[];
  uploading?: boolean;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onRemove: (fotoId: number) => void;
  onRemovePending?: (index: number) => void;
  resolveUrl: (path: string) => string;
  testID?: string;
};

export function FotosSection({
  fotos,
  pending = [],
  uploading = false,
  onPickGallery,
  onPickCamera,
  onRemove,
  onRemovePending,
  resolveUrl,
  testID = "patrimonio-fotos",
}: FotosSectionProps) {
  const theme = useTheme<AppTheme>();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const hasPhotos = fotos.length > 0 || pending.length > 0;

  return (
    <View style={styles.container} testID={testID}>
      <Text
        variant="titleSmall"
        style={[styles.heading, { color: theme.colors.onSurface }]}
      >
        Fotos
      </Text>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {fotos.map((foto) => (
            <View key={foto.id} style={styles.fotoItem}>
              <Pressable
                onPress={() => setPreviewUri(resolveUrl(foto.url))}
                accessibilityLabel="Ampliar foto"
                testID={`${testID}-open-${foto.id}`}
              >
                <Image
                  source={{ uri: resolveUrl(foto.url) }}
                  style={[
                    styles.fotoImage,
                    foto.principal
                      ? { borderColor: theme.colors.primary, borderWidth: 2 }
                      : null,
                  ]}
                  testID={`${testID}-img-${foto.id}`}
                />
              </Pressable>
              <View style={styles.fotoActions}>
                <IconButton
                  icon="delete"
                  size={18}
                  onPress={() => onRemove(foto.id)}
                  iconColor={theme.colors.error}
                  style={styles.fotoButton}
                  accessibilityLabel="Remover foto"
                  testID={`${testID}-remove-${foto.id}`}
                />
              </View>
            </View>
          ))}
          {pending.map((foto, index) => (
            <View key={`pending-${index}`} style={styles.fotoItem}>
              <Pressable
                onPress={() => setPreviewUri(foto.uri)}
                accessibilityLabel="Ampliar foto"
                testID={`${testID}-pending-open-${index}`}
              >
                <Image
                  source={{ uri: foto.uri }}
                  style={styles.fotoImage}
                  testID={`${testID}-pending-img-${index}`}
                />
              </Pressable>
              <View style={styles.fotoActions}>
                <IconButton
                  icon="delete"
                  size={18}
                  onPress={() => onRemovePending?.(index)}
                  iconColor={theme.colors.error}
                  style={styles.fotoButton}
                  accessibilityLabel="Remover foto"
                  testID={`${testID}-pending-remove-${index}`}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Nenhuma foto adicionada.
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="image-multiple"
          onPress={onPickGallery}
          loading={uploading}
          disabled={uploading}
          style={styles.button}
          testID={`${testID}-gallery`}
        >
          Galeria
        </Button>
        <Button
          mode="contained-tonal"
          icon="camera"
          onPress={onPickCamera}
          loading={uploading}
          disabled={uploading}
          style={styles.button}
          testID={`${testID}-camera`}
        >
          Câmera
        </Button>
      </View>

      <Portal>
        {previewUri ? (
          <Pressable
            style={styles.previewBackdrop}
            onPress={() => setPreviewUri(null)}
            accessibilityLabel="Fechar foto ampliada"
            testID={`${testID}-preview`}
          >
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  heading: {
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: {
    fontStyle: "italic",
    marginBottom: 12,
  },
  list: {
    marginBottom: 12,
  },
  listContent: {
    gap: 12,
  },
  fotoItem: {
    alignItems: "center",
  },
  fotoImage: {
    width: 132,
    height: 132,
    borderRadius: 8,
    backgroundColor: "#00000010",
  },
  fotoActions: {
    flexDirection: "row",
  },
  fotoButton: {
    margin: 0,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    borderRadius: 8,
    flex: 1,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
});
