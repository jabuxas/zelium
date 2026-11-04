import { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "@/src/shared/api/client";
import { useAuth } from "@/src/shared/auth/AuthContext";
import { spacing, radii, type AppTheme } from "@/src/shared/theme/tokens";

/**
 * Alteração da própria senha (qualquer perfil). A API revoga TODAS as
 * sessões da conta — inclusive a deste aparelho: após trocar, o app
 * encerra a sessão local e volta ao login (ADR-0015).
 */
export default function AlterarSenhaScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alterarSenha() {
    setErro(null);
    if (senha.length < 12) {
      setErro("A nova senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = (await apiClient("/usuarios/senha", {
        method: "POST",
        body: JSON.stringify({ senha_atual: senhaAtual, senha }),
      })) as { message?: string };
      setSucesso(resultado.message ?? "Senha alterada. Entre novamente com a nova senha.");
      setSenhaAtual("");
      setSenha("");
      setConfirmarSenha("");
      // A sessão atual foi revogada pelo servidor: volta ao login.
      await logout();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View
      testID="alterar-senha-container"
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 },
      ]}
    >
      <ScrollView testID="alterar-senha-scroll" contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineSmall" accessibilityRole="header" style={styles.heading}>
            Alterar senha
          </Text>

          <Card mode="outlined" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <Card.Content style={styles.cardContent}>
              <TextInput
                label="Senha atual"
                mode="outlined"
                secureTextEntry
                autoComplete="current-password"
                testID="conta-senha-atual"
                value={senhaAtual}
                onChangeText={setSenhaAtual}
                style={styles.campo}
              />
              <TextInput
                label="Nova senha"
                mode="outlined"
                secureTextEntry
                autoComplete="new-password"
                testID="conta-senha-nova"
                value={senha}
                onChangeText={setSenha}
                placeholder="Pelo menos 12 caracteres"
                style={styles.campo}
              />
              <TextInput
                label="Confirmar nova senha"
                mode="outlined"
                secureTextEntry
                autoComplete="new-password"
                testID="conta-senha-confirmar"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                style={styles.campo}
              />

              {erro ? (
                <Text variant="bodyMedium" style={[styles.mensagem, { color: theme.colors.error }]}>
                  {erro}
                </Text>
              ) : null}
              {sucesso ? (
                <Text variant="bodyMedium" style={[styles.mensagem, { color: theme.colors.primary }]}>
                  {sucesso}
                </Text>
              ) : null}

              <Button
                mode="contained"
                contentStyle={styles.buttonContent}
                onPress={alterarSenha}
                disabled={enviando || !!sucesso}
                accessibilityLabel="Alterar senha"
              >
                {enviando ? "Alterando..." : "Alterar senha"}
              </Button>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Ao alterar a senha, todas as sessões desta conta são
                encerradas — inclusive neste aparelho — e será preciso entrar
                novamente.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  content: { width: '100%', maxWidth: 768, alignSelf: 'center' },
  heading: { fontWeight: '700', marginBottom: spacing.md },
  card: { borderRadius: radii.medium },
  cardContent: { gap: spacing.md },
  campo: { backgroundColor: 'transparent' },
  mensagem: { marginTop: spacing.xs },
  buttonContent: { paddingVertical: spacing.xs },
});
