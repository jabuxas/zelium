import React from "react";
import { renderAsync, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { buildPaperTheme } from '@/src/shared/theme/tokens';

import AlterarSenhaScreen from "../AlterarSenhaScreen";
import { ApiError } from "@/src/shared/api/errors";

const mockLogout = jest.fn();
jest.mock("@/src/shared/auth/AuthContext", () => ({
  useAuth: () => ({ usuario: { id: 7, nome: "Ana", email: "ana@exemplo.local", papel: "gestor" }, logout: mockLogout }),
}));

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaInsetsContext: React.createContext({ top: 32, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 32, right: 0, bottom: 0, left: 0 }),
  };
});

import { apiClient } from "@/src/shared/api/client";
const apiClientMock = apiClient as jest.Mock;

function renderWithProviders(ui: React.ReactElement) {
  return renderAsync(<PaperProvider theme={buildPaperTheme('light')}>{ui}</PaperProvider>);
}

async function preencher(atual: string, nova: string, confirmar = nova) {
  fireEvent.changeText(screen.getByTestId("conta-senha-atual"), atual);
  fireEvent.changeText(screen.getByTestId("conta-senha-nova"), nova);
  fireEvent.changeText(screen.getByTestId("conta-senha-confirmar"), confirmar);
  fireEvent.press(screen.getByRole("button", { name: /Alterar senha/i }));
}

describe("AlterarSenhaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClientMock.mockReset();
  });

  it("envia senha_atual e senha para /usuarios/senha e orienta novo login", async () => {
    apiClientMock.mockResolvedValue({ message: "Senha alterada. Faca login novamente com a nova senha." });
    await renderWithProviders(<AlterarSenhaScreen />);
    await preencher("Zelium@2026", "SenhaNovaForte@99");

    await waitFor(() => expect(screen.getByText(/Senha alterada/i)).toBeTruthy());
    expect(apiClientMock).toHaveBeenCalledWith("/usuarios/senha", expect.objectContaining({ method: "POST" }));
    const corpo = JSON.parse(apiClientMock.mock.calls[0][1].body as string);
    expect(corpo).toEqual({ senha_atual: "Zelium@2026", senha: "SenhaNovaForte@99" });
    // Sessão revogada: o app encerra a sessão local e volta ao login
    expect(mockLogout).toHaveBeenCalled();
  });

  it("recusa confirmação divergente sem chamar a API", async () => {
    await renderWithProviders(<AlterarSenhaScreen />);
    await preencher("Zelium@2026", "SenhaNovaForte@99", "diferente");
    expect(await screen.findByText(/não coincidem/i)).toBeTruthy();
    expect(apiClientMock).not.toHaveBeenCalled();
  });

  it("recusa senha curta client-side", async () => {
    await renderWithProviders(<AlterarSenhaScreen />);
    await preencher("Zelium@2026", "curta123");
    expect(await screen.findByText(/pelo menos 12/i)).toBeTruthy();
    expect(apiClientMock).not.toHaveBeenCalled();
  });

  it("senha atual incorreta mostra o erro da API sem deslogar", async () => {
    apiClientMock.mockRejectedValue(new ApiError("Senha atual incorreta", 400, { error: "Senha atual incorreta" }));
    await renderWithProviders(<AlterarSenhaScreen />);
    await preencher("errada", "SenhaNovaForte@99");
    expect(await screen.findByText(/Senha atual incorreta/i)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("trial expirado orienta sem deslogar (consultas continuam)", async () => {
    apiClientMock.mockRejectedValue(new ApiError("Periodo de trial expirado: escritas bloqueadas.", 403, {
      error: "Periodo de trial expirado: escritas bloqueadas.", codigo: "trial_expirado",
    }));
    await renderWithProviders(<AlterarSenhaScreen />);
    await preencher("Zelium@2026", "SenhaNovaForte@99");
    expect(await screen.findByText(/trial expirado/i)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
