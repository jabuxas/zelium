import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import Colors from "@/constants/Colors";
import type { useColorScheme } from "@/components/useColorScheme";

type ColorScheme = ReturnType<typeof useColorScheme>;

export function buildPaperTheme(scheme: ColorScheme) {
  const isDark = (scheme as string) === "dark";
  const palette = isDark ? Colors.dark : Colors.light;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      onPrimary: isDark ? "#000" : "#fff",
      background: palette.background,
      onBackground: palette.text,
      surface: palette.background,
      onSurface: palette.text,
      error: "#B3261E",
      onError: "#fff",
    },
  };
}

export type AppTheme = ReturnType<typeof buildPaperTheme>;
