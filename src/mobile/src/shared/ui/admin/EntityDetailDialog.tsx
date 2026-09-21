import { useEffect, useState } from "react";
import { View, Image, StyleSheet, ScrollView } from "react-native";
import {
  Dialog,
  Portal,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";
import type { MetadataItem } from "./DenseEntityCard";

const CAROUSEL_HEIGHT = 240;

export type EntityDetailDialogProps = {
  visible: boolean;
  title: string;
  metadata: MetadataItem[];
  onClose: () => void;
  onEdit?: () => void;
  thumbnailUri?: string | null | undefined;
  loadImages?: (() => Promise<string[]>) | undefined;
  testID?: string;
};

export function EntityDetailDialog({
  visible,
  title,
  metadata,
  onClose,
  onEdit,
  thumbnailUri,
  loadImages,
  testID,
}: EntityDetailDialogProps) {
  const theme = useTheme<AppTheme>();
  const id = testID ?? "entity-detail-dialog";

  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setActiveIndex(0);
    if (!loadImages) {
      setImages([]);
      return;
    }
    let cancelled = false;
    setImagesLoading(true);
    loadImages()
      .then((urls) => {
        if (!cancelled) setImages(urls);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      })
      .finally(() => {
        if (!cancelled) setImagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, loadImages]);

  const gallery = images.length
    ? images
    : thumbnailUri
      ? [thumbnailUri]
      : [];

  const safeIndex = Math.min(activeIndex, Math.max(gallery.length - 1, 0));

  const goTo = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(gallery.length - 1, index)));
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} testID={id}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            {imagesLoading ? (
              <View style={styles.imageLoading} testID={`${id}-image-loading`}>
                <ActivityIndicator />
              </View>
            ) : gallery.length === 1 ? (
              <Image
                source={{ uri: gallery[0] }}
                style={styles.image}
                resizeMode="contain"
                testID={`${id}-image`}
              />
            ) : gallery.length > 1 ? (
              <View style={styles.carousel} testID={`${id}-carousel`}>
                <Image
                  source={{ uri: gallery[safeIndex] }}
                  style={styles.pagerImage}
                  resizeMode="contain"
                  testID={`${id}-image-${safeIndex}`}
                />
                {safeIndex > 0 ? (
                  <IconButton
                    icon="chevron-left"
                    mode="contained"
                    size={24}
                    onPress={() => goTo(safeIndex - 1)}
                    style={[styles.navButton, styles.navLeft]}
                    accessibilityLabel="Imagem anterior"
                    testID={`${id}-prev`}
                  />
                ) : null}
                {safeIndex < gallery.length - 1 ? (
                  <IconButton
                    icon="chevron-right"
                    mode="contained"
                    size={24}
                    onPress={() => goTo(safeIndex + 1)}
                    style={[styles.navButton, styles.navRight]}
                    accessibilityLabel="Próxima imagem"
                    testID={`${id}-next`}
                  />
                ) : null}
                <View style={styles.dots}>
                  {gallery.map((uri, index) => (
                    <View
                      key={`dot-${uri}-${index}`}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            index === safeIndex
                              ? theme.colors.primary
                              : theme.colors.outlineVariant,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  variant="labelSmall"
                  style={[styles.counter, { color: theme.colors.onSurface }]}
                >
                  {safeIndex + 1}/{gallery.length}
                </Text>
              </View>
            ) : null}
            {metadata.map((item) => (
              <View key={item.label} style={styles.row}>
                <Text
                  variant="labelMedium"
                  style={[styles.label, { color: theme.colors.onSurface }]}
                >
                  {item.label}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.value, { color: theme.colors.onSurface }]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          {onEdit ? (
            <Button onPress={onEdit} testID={`${id}-edit`} accessibilityLabel={`Editar ${title}`}>
              Editar
            </Button>
          ) : null}
          <Button onPress={onClose} testID={`${id}-close`} accessibilityLabel="Fechar">
            Fechar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  image: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 4 / 3,
    alignSelf: "center",
    borderRadius: 8,
    marginBottom: 16,
  },
  imageLoading: {
    width: "100%",
    height: CAROUSEL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  carousel: {
    marginBottom: 16,
    justifyContent: "center",
  },
  pagerImage: {
    width: "100%",
    height: CAROUSEL_HEIGHT,
    borderRadius: 8,
  },
  navButton: {
    position: "absolute",
    top: CAROUSEL_HEIGHT / 2 - 20,
    opacity: 0.9,
  },
  navLeft: {
    left: 4,
  },
  navRight: {
    right: 4,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  counter: {
    textAlign: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  row: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  label: {
    opacity: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
  },
});
