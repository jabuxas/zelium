import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { EntityFormSheet } from "@/src/shared/ui/admin/EntityFormSheet";
import type { FormField } from "@/src/shared/ui/admin/EntityFormSheet";

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

const fields: FormField[] = [
  { name: "nome", label: "Nome", placeholder: "Digite o nome" },
  { name: "descricao", label: "Descrição", multiline: true },
  { name: "codigo", label: "Código", keyboardType: "numeric" },
];

const values = {
  nome: "Ambiente 1",
  descricao: "Uma descrição",
  codigo: "AMB-001",
};

describe("EntityFormSheet", () => {
  it("renders title when visible", () => {
    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Novo Ambiente"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText("Novo Ambiente")).toBeTruthy();
  });

  it("renders all field labels", () => {
    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getAllByText("Nome").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Descrição").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Código").length).toBeGreaterThan(0);
  });

  it("calls onChange when text input changes", () => {
    const onChange = jest.fn();

    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={[fields[0]]}
        values={{ nome: "" }}
        onChange={onChange}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const input = screen.getByTestId("entity-form-sheet-field-nome");
    fireEvent.changeText(input, "Novo Nome");
    expect(onChange).toHaveBeenCalledWith("nome", "Novo Nome");
  });

  it("calls onSave when save button pressed", () => {
    const onSave = jest.fn();

    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={onSave}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("entity-form-sheet-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button pressed", () => {
    const onCancel = jest.fn();

    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(screen.getByTestId("entity-form-sheet-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when saving", () => {
    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        saving={true}
      />,
    );

    const saveButton = screen.getByTestId("entity-form-sheet-save");
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it("uses custom testID", () => {
    renderWithPaper(
      <EntityFormSheet
        visible={true}
        title="Editar"
        fields={fields}
        values={values}
        onChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        testID="my-form"
      />,
    );

    expect(screen.getByTestId("my-form")).toBeTruthy();
    expect(screen.getByTestId("my-form-field-nome")).toBeTruthy();
  });
});