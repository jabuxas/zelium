import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { SearchFilterBar } from "@/src/shared/ui/admin/SearchFilterBar";

function renderWithPaper(children: React.ReactNode) {
  return render(<PaperProvider>{children}</PaperProvider>);
}

describe("SearchFilterBar", () => {
  it("renders with default placeholder", () => {
    renderWithPaper(
      <SearchFilterBar value="" onChange={jest.fn()} />,
    );

    expect(screen.getByPlaceholderText("Buscar...")).toBeTruthy();
  });

  it("renders with custom placeholder", () => {
    renderWithPaper(
      <SearchFilterBar
        value=""
        onChange={jest.fn()}
        placeholder="Buscar patrimônio..."
      />,
    );

    expect(screen.getByPlaceholderText("Buscar patrimônio...")).toBeTruthy();
  });

  it("displays current value", () => {
    renderWithPaper(
      <SearchFilterBar value="Ambiente" onChange={jest.fn()} />,
    );

    expect(screen.getByDisplayValue("Ambiente")).toBeTruthy();
  });

  it("calls onChange when text changes", () => {
    const onChange = jest.fn();

    renderWithPaper(
      <SearchFilterBar value="" onChange={onChange} />,
    );

    fireEvent.changeText(screen.getByTestId("search-filter-bar"), "Novo");
    expect(onChange).toHaveBeenCalledWith("Novo");
  });

  it("uses custom testID", () => {
    renderWithPaper(
      <SearchFilterBar
        value=""
        onChange={jest.fn()}
        testID="my-search"
      />,
    );

    expect(screen.getByTestId("my-search")).toBeTruthy();
  });

  it("has accessibility label matching placeholder", () => {
    renderWithPaper(
      <SearchFilterBar
        value=""
        onChange={jest.fn()}
        placeholder="Buscar item"
      />,
    );

    expect(screen.getByLabelText("Buscar item")).toBeTruthy();
  });
});