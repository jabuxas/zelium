import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { DenseEntityCard } from "@/src/shared/ui/admin/DenseEntityCard";
import type { MetadataItem } from "@/src/shared/ui/admin/DenseEntityCard";

function renderWithPaper(children: React.ReactNode) {
  return render(<PaperProvider>{children}</PaperProvider>);
}

const metadata: MetadataItem[] = [
  { label: "Código", value: "AMB-001" },
  { label: "Tipo", value: "Sala" },
];

describe("DenseEntityCard", () => {
  it("renders title", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    expect(screen.getByText("Ambiente 1")).toBeTruthy();
  });

  it("renders metadata labels and values", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    expect(screen.getByText("Código")).toBeTruthy();
    expect(screen.getByText("AMB-001")).toBeTruthy();
    expect(screen.getByText("Tipo")).toBeTruthy();
    expect(screen.getByText("Sala")).toBeTruthy();
  });

  it("calls onEdit when edit button pressed", () => {
    const onEdit = jest.fn();

    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={onEdit}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    fireEvent.press(screen.getByTestId("card-edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button pressed", () => {
    const onDelete = jest.fn();

    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={onDelete}
        testID="card"
      />,
    );

    fireEvent.press(screen.getByTestId("card-delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("uses custom testID when provided", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="my-card"
      />,
    );

    expect(screen.getByTestId("my-card")).toBeTruthy();
    expect(screen.getByTestId("my-card-edit")).toBeTruthy();
    expect(screen.getByTestId("my-card-delete")).toBeTruthy();
  });

  it("renders with empty metadata", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Empty"
        metadata={[]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    expect(screen.getByText("Empty")).toBeTruthy();
  });

  it("opens detail dialog when card body pressed", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    fireEvent.press(screen.getByTestId("card-open"));
    expect(screen.getByTestId("card-detail")).toBeTruthy();
  });

  it("calls onEdit from detail dialog edit button", () => {
    const onEdit = jest.fn();

    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={onEdit}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    fireEvent.press(screen.getByTestId("card-open"));
    fireEvent.press(screen.getByTestId("card-detail-edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("has accessibility labels on action buttons", () => {
    renderWithPaper(
      <DenseEntityCard
        title="Ambiente 1"
        metadata={metadata}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        testID="card"
      />,
    );

    expect(
      screen.getByLabelText("Editar Ambiente 1"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Excluir Ambiente 1"),
    ).toBeTruthy();
  });
});