import React from "react";
import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { EntityListScaffold } from "@/src/shared/ui/admin/EntityListScaffold";

function renderWithPaper(children: React.ReactNode) {
  return render(<PaperProvider>{children}</PaperProvider>);
}

describe("EntityListScaffold", () => {
  it("shows loading indicator when loading", () => {
    renderWithPaper(
      <EntityListScaffold loading={true} error={null} empty={false}>
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByTestId("entity-list-loading")).toBeTruthy();
  });

  it("shows error message when error provided", () => {
    renderWithPaper(
      <EntityListScaffold
        loading={false}
        error="Falha ao carregar"
        empty={false}
        onRetry={jest.fn()}
      >
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByText("Falha ao carregar")).toBeTruthy();
    expect(screen.getByTestId("entity-list-retry")).toBeTruthy();
  });

  it("calls onRetry when retry button pressed", () => {
    const onRetry = jest.fn();

    renderWithPaper(
      <EntityListScaffold
        loading={false}
        error="Erro"
        empty={false}
        onRetry={onRetry}
      >
        <></>
      </EntityListScaffold>,
    );

    fireEvent.press(screen.getByTestId("entity-list-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when onRetry not provided", () => {
    renderWithPaper(
      <EntityListScaffold loading={false} error="Erro" empty={false}>
        <></>
      </EntityListScaffold>,
    );

    expect(screen.queryByTestId("entity-list-retry")).toBeNull();
  });

  it("shows empty message when empty", () => {
    renderWithPaper(
      <EntityListScaffold loading={false} error={null} empty={true}>
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByText("Nenhum item encontrado.")).toBeTruthy();
  });

  it("shows custom empty message", () => {
    renderWithPaper(
      <EntityListScaffold
        loading={false}
        error={null}
        empty={true}
        emptyMessage="Nenhum patrimônio."
      >
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByText("Nenhum patrimônio.")).toBeTruthy();
  });

  it("shows empty action button when provided", () => {
    const onEmptyAction = jest.fn();

    renderWithPaper(
      <EntityListScaffold
        loading={false}
        error={null}
        empty={true}
        emptyActionLabel="Adicionar"
        onEmptyAction={onEmptyAction}
      >
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByText("Adicionar")).toBeTruthy();
    fireEvent.press(screen.getByTestId("entity-list-empty-action"));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
  });

  it("renders children when not loading, no error, and not empty", () => {
    renderWithPaper(
      <EntityListScaffold loading={false} error={null} empty={false}>
        <>
          <Text>Item 1</Text>
          <Text>Item 2</Text>
        </>
      </EntityListScaffold>,
    );

    expect(screen.getByText("Item 1")).toBeTruthy();
    expect(screen.getByText("Item 2")).toBeTruthy();
  });

  it("uses custom testID", () => {
    renderWithPaper(
      <EntityListScaffold
        loading={true}
        error={null}
        empty={false}
        testID="my-list"
      >
        <></>
      </EntityListScaffold>,
    );

    expect(screen.getByTestId("my-list-loading")).toBeTruthy();
  });
});