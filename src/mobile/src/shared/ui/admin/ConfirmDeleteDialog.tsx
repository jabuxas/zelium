import { View, StyleSheet } from "react-native";
import { Dialog, Portal, Text, Button, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";

export type ConfirmDeleteDialogProps = {
  visible: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string | null;
  testID?: string;
};

export function ConfirmDeleteDialog({
  visible,
  itemName,
  onConfirm,
  onCancel,
  error,
  testID,
}: ConfirmDeleteDialogProps) {
  const theme = useTheme<AppTheme>();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
        testID={testID ?? "confirm-delete-dialog"}
      >
        <Dialog.Title>Confirmar exclusão</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            Tem certeza que deseja excluir{" "}
            <Text variant="bodyMedium" style={{ fontWeight: "700" }}>
              {itemName}
            </Text>
            ?
          </Text>
          {error ? (
            <View
              style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}
              testID={`${testID ?? "confirm-delete-dialog"}-error`}
              accessibilityLabel={`Erro: ${error}`}
            >
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error }}
              >
                {error}
              </Text>
            </View>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={onCancel}
            testID={`${testID ?? "confirm-delete-dialog"}-cancel`}
            accessibilityLabel="Cancelar exclusão"
          >
            Cancelar
          </Button>
          <Button
            onPress={onConfirm}
            textColor={theme.colors.error}
            testID={`${testID ?? "confirm-delete-dialog"}-confirm`}
            accessibilityLabel="Confirmar exclusão"
          >
            Excluir
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
});