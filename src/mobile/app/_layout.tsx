import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { buildPaperTheme } from "@/src/shared/theme/tokens";
import { ToastProvider } from "@/src/shared/ui/toast";
import { AuthProvider, useAuth } from "@/src/shared/auth/AuthContext";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const paperTheme = buildPaperTheme(colorScheme);
  const { autenticado, carregando } = useAuth();
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outlineVariant,
      primary: paperTheme.colors.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ToastProvider>
          <ThemeProvider value={navTheme}>
            <Stack>
              {carregando ? (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              ) : (
                <>
                  <Stack.Protected guard={autenticado}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack.Protected>
                  <Stack.Protected guard={!autenticado}>
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                  </Stack.Protected>
                  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </>
              )}
            </Stack>
          </ThemeProvider>
        </ToastProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
