import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/shared/auth/AuthContext";

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleLogin() {
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
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.card}>
        <Text variant="headlineMedium" style={styles.title}>
          Zelium
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Gestão Patrimonial — entre com sua conta
        </Text>

        <TextInput
          label="E-mail"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          label="Senha"
          mode="outlined"
          secureTextEntry
          autoComplete="current-password"
          value={senha}
          onChangeText={setSenha}
          onSubmitEditing={handleLogin}
          style={styles.input}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={enviando}
          disabled={enviando || !email.trim() || !senha}
          style={styles.button}
        >
          Entrar
        </Button>

        <Text variant="bodySmall" style={styles.hint}>
          Perfis: Gestor, Responsável e Conferente
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    gap: 12,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 4,
  },
  erro: {
    color: "#dc2626",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  hint: {
    textAlign: "center",
    marginTop: 8,
    opacity: 0.6,
  },
});
