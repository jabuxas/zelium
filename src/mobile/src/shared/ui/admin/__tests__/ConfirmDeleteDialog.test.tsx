import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { ConfirmDeleteDialog } from "@/src/shared/ui/admin/ConfirmDeleteDialog";

jest.mock("react-native-paper", () => {
  const actual = jest.requireActual("react-native-paper");
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function renderWithPaper(children: React.ReactNode) {
  return render(<PaperProvider>{children}</PaperProvider>);
}

describe("ConfirmDeleteDialog", () => {
  it("renders item name in dialog when visible", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Ambiente 1"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText("Ambiente 1")).toBeTruthy();
  });

  it("renders title text", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText("Confirmar exclusão")).toBeTruthy();
  });

  it("calls onConfirm when confirm button pressed", () => {
    const onConfirm = jest.fn();

    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("confirm-delete-dialog-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button pressed", () => {
    const onCancel = jest.fn();

    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(screen.getByTestId("confirm-delete-dialog-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows error message when error prop provided", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        error="Este item possui dependências."
      />,
    );

    expect(screen.getByText("Este item possui dependências.")).toBeTruthy();
  });

  it("does not show error section when no error", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("confirm-delete-dialog-error")).toBeNull();
  });

  it("uses custom testID", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Item"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        testID="my-dialog"
      />,
    );

    expect(screen.getByTestId("my-dialog")).toBeTruthy();
    expect(screen.getByTestId("my-dialog-confirm")).toBeTruthy();
    expect(screen.getByTestId("my-dialog-cancel")).toBeTruthy();
  });

  it("has accessibility labels on action buttons", () => {
    renderWithPaper(
      <ConfirmDeleteDialog
        visible={true}
        itemName="Ambiente X"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Cancelar exclusão")).toBeTruthy();
    expect(screen.getByLabelText("Confirmar exclusão")).toBeTruthy();
  });
});