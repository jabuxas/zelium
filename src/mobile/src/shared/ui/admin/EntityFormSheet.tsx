import { useState, type ReactNode } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  KeyboardType,
  useWindowDimensions,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  Icon,
  useTheme,
} from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";

export type SelectOption = {
  label: string;
  value: string;
};

export type FormField = {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardType;
  type?: "text" | "select";
  options?: SelectOption[];
};

export type EntityFormSheetProps = {
  visible: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  extraContent?: ReactNode;
  testID?: string;
};

export function EntityFormSheet({
  visible,
  title,
  fields,
  values,
  onChange,
  onSave,
  onCancel,
  saving = false,
  extraContent,
  testID,
}: EntityFormSheetProps) {
  const theme = useTheme<AppTheme>();
  const { height: windowHeight } = useWindowDimensions();
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
        testID={testID ?? "entity-form-sheet"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onSurface }}
            >
              {title}
            </Text>
          </View>

          <ScrollView
            style={[styles.formScroll, { maxHeight: windowHeight * 0.6 }]}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map((field) => {
              if (field.type === "select") {
                const options = field.options ?? [];
                const selected = options.find(
                  (option) => option.value === (values[field.name] ?? ""),
                );

                return (
                  <View key={field.name}>
                    <Pressable
                      disabled={saving || options.length === 0}
                      onPress={() =>
                        setOpenSelect((current) =>
                          current === field.name ? null : field.name,
                        )
                      }
                      testID={`${testID ?? "entity-form-sheet"}-field-${field.name}-trigger`}
                      accessibilityRole="button"
                      accessibilityLabel={field.label}
                    >
                      <View pointerEvents="none">
                        <TextInput
                          label={field.label}
                          {...(field.placeholder
                            ? { placeholder: field.placeholder }
                            : {})}
                          value={selected?.label ?? ""}
                          mode="outlined"
                          style={styles.input}
                          testID={`${testID ?? "entity-form-sheet"}-field-${field.name}`}
                          accessibilityLabel={field.label}
                          disabled={saving || options.length === 0}
                          editable={false}
                        />
                        <View style={styles.selectIcon}>
                          <Icon
                            source="menu-down"
                            size={24}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </View>
                      </View>
                    </Pressable>
                    {openSelect === field.name ? (
                      <View style={styles.selectOptions}>
                        {options.map((option) => (
                          <Button
                            key={option.value}
                            mode={
                              option.value === values[field.name]
                                ? "contained-tonal"
                                : "text"
                            }
                            onPress={() => {
                              onChange(field.name, option.value);
                              setOpenSelect(null);
                            }}
                            contentStyle={styles.selectOptionContent}
                            style={styles.selectOption}
                            testID={`${testID ?? "entity-form-sheet"}-field-${field.name}-option-${option.value}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              }

              return (
                <TextInput
                  key={field.name}
                  label={field.label}
                  {...(field.placeholder
                    ? { placeholder: field.placeholder }
                    : {})}
                  value={values[field.name] ?? ""}
                  onChangeText={(text) => onChange(field.name, text)}
                  mode="outlined"
                  {...(field.multiline ? { multiline: true } : {})}
                  {...(field.keyboardType ? { keyboardType: field.keyboardType } : {})}
                  style={styles.input}
                  testID={`${testID ?? "entity-form-sheet"}-field-${field.name}`}
                  accessibilityLabel={field.label}
                  disabled={saving}
                />
              );
            })}
            {extraContent}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onCancel}
              disabled={saving}
              style={styles.button}
              testID={`${testID ?? "entity-form-sheet"}-cancel`}
              accessibilityLabel="Cancelar"
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={onSave}
              loading={saving}
              disabled={saving}
              style={styles.button}
              testID={`${testID ?? "entity-form-sheet"}-save`}
              accessibilityLabel="Salvar"
            >
              Salvar
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flexShrink: 1,
  },
  modal: {
    marginHorizontal: 16,
    marginVertical: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  formScroll: {
    flexGrow: 0,
    paddingHorizontal: 20,
  },
  input: {
    marginBottom: 12,
  },
  selectIcon: {
    position: "absolute",
    right: 12,
    top: 16,
  },
  selectOptions: {
    marginTop: -8,
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  selectOption: {
    borderRadius: 0,
  },
  selectOptionContent: {
    justifyContent: "flex-start",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  button: {
    minWidth: 100,
  },
});
