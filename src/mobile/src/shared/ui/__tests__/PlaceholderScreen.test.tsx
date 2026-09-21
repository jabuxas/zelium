import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { PlaceholderScreen } from "@/src/shared/ui/PlaceholderScreen";
import { getResource } from "@/src/shared/domain/registry";

function renderWithPaper(children: React.ReactNode) {
  return render(<PaperProvider>{children}</PaperProvider>);
}

describe("PlaceholderScreen", () => {
  it("renders resource label as title", () => {
    const resource = getResource("patrimonios");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(screen.getByText("Patrimônios")).toBeTruthy();
  });

  it("renders API path", () => {
    const resource = getResource("ambientes");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(screen.getByText("/ambientes")).toBeTruthy();
  });

  it("renders mobile route", () => {
    const resource = getResource("responsaveis");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(screen.getByText("Responsaveis")).toBeTruthy();
  });

  it("shows migration pending message", () => {
    const resource = getResource("patrimonios");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(screen.getByText("Migração pendente")).toBeTruthy();
  });

  it("shows hint text", () => {
    const resource = getResource("patrimonios");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(
      screen.getByText("Tela a ser migrada do front para React Native."),
    ).toBeTruthy();
  });

  it("renders labels for API and mobile sections", () => {
    const resource = getResource("conferentes");

    renderWithPaper(<PlaceholderScreen resource={resource} />);

    expect(screen.getByText("Rota da API")).toBeTruthy();
    expect(screen.getByText("Rota mobile")).toBeTruthy();
  });
});
