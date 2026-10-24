import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { palettes } from './palette';
import type { ColorSchemeName } from 'react-native';

type ColorScheme = ColorSchemeName;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 } as const;
export const radii = { small: 8, medium: 12 } as const;

export function buildPaperTheme(scheme: ColorScheme) {
  const isDark = scheme === "dark";
  const palette = isDark ? palettes.dark : palettes.light;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    roundness: 3,
    spacing,
    radii,
    colors: {
      ...base.colors,
      primary: palette.primary,
      onPrimary: palette.onPrimary,
      primaryContainer: palette.primaryContainer,
      onPrimaryContainer: palette.onPrimaryContainer,
      background: palette.background,
      onBackground: palette.text,
      surface: palette.surface,
      onSurface: palette.text,
      surfaceVariant: palette.surfaceVariant,
      onSurfaceVariant: palette.secondaryText,
      outline: palette.outline,
      outlineVariant: palette.border,
      secondary: palette.secondaryText,
      secondaryContainer: palette.surfaceVariant,
      onSecondaryContainer: palette.text,
      error: palette.error,
      onError: isDark ? palettes.dark.background : palettes.light.surface,
      errorContainer: palette.errorContainer,
      onErrorContainer: palette.onErrorContainer,
      success: palette.success,
      successContainer: palette.successContainer,
      warning: palette.warning,
      warningContainer: palette.warningContainer,
      elevation: { ...base.colors.elevation, level1: palette.surface, level2: palette.surface, level3: palette.surface, level4: palette.surface, level5: palette.surface },
    },
  };
}

export type AppTheme = ReturnType<typeof buildPaperTheme>;
