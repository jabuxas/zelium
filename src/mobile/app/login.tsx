import { useRef, useState } from "react";
import type { TextInput as NativeTextInput } from 'react-native';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/shared/auth/AuthContext";
import { ZeliumBrand } from '@/src/shared/brand/ZeliumBrand';
import { radii, spacing, type AppTheme } from '@/src/shared/theme/tokens';

export default function LoginScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { login, logout, erroSessao } = useAuth();
  const senhaRef = useRef<NativeTextInput>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
    if (enviando || !email.trim() || !senha) return;
    setErro(null);
    setEnviando(true);
    try {
      await login(email.trim(), senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <ZeliumBrand />
        <Text variant="headlineSmall" style={styles.title}>Entre na sua conta</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Acesse os patrimônios e as conferências da sua organização.
        </Text>

        <TextInput
          label="E-mail"
          accessibilityLabel="E-mail"
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          disabled={enviando}
          returnKeyType="next"
          onSubmitEditing={() => senhaRef.current?.focus()}
          style={styles.input}
        />

        <TextInput
          label="Senha"
          accessibilityLabel="Senha"
          ref={senhaRef}
          mode="outlined"
          secureTextEntry
          autoComplete="current-password"
          value={senha}
          onChangeText={setSenha}
          disabled={enviando}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          style={styles.input}
        />

        {(erro || erroSessao) && <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{erro ?? erroSessao}</Text>}
        {erroSessao && <Button disabled={enviando} onPress={() => { void logout(); }}>Limpar sessão salva</Button>}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={enviando}
          disabled={enviando || !email.trim() || !senha}
          style={styles.button}
          contentStyle={{ minHeight: 48 }}
        >
          Entrar
        </Button>

        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Perfis: Gestor, Responsável e Conferente
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.medium,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: spacing.xs,
    borderRadius: radii.small,
  },
  hint: {
    textAlign: "center",
    marginTop: 8,
  },
});
