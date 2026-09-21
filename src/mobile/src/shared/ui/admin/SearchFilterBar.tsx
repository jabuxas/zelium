import { StyleSheet } from "react-native";
import { TextInput, useTheme } from "react-native-paper";
import type { AppTheme } from "@/src/shared/theme/tokens";

export type SearchFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testID?: string;
};

export function SearchFilterBar({
  value,
  onChange,
  placeholder = "Buscar...",
  testID,
}: SearchFilterBarProps) {
  const theme = useTheme<AppTheme>();

  return (
    <TextInput
      mode="outlined"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      left={<TextInput.Icon icon="magnify" />}
      style={[styles.input, { backgroundColor: theme.colors.surface }]}
      dense
      testID={testID ?? "search-filter-bar"}
      accessibilityLabel={placeholder}
      accessibilityRole="search"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
});