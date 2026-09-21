import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ToastProvider, useToast } from "@/src/shared/ui/toast/ToastProvider";

jest.mock("react-native-paper", () => {
  return {
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

function ToastConsumer() {
  const { toast } = useToast();
  return (
    <>
      <TouchableOpacity
        testID="show-error"
        onPress={() => toast("Error occurred", "error")}
      >
        <Text>Show Error</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-success"
        onPress={() => toast("Success!", "success")}
      >
        <Text>Show Success</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-info"
        onPress={() => toast("Info message", "info")}
      >
        <Text>Show Info</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-default"
        onPress={() => toast("Default type")}
      >
        <Text>Show Default</Text>
      </TouchableOpacity>
    </>
  );
}

function renderWithToast() {
  return render(
    <ToastProvider>
      <ToastConsumer />
    </ToastProvider>,
  );
}

describe("ToastProvider", () => {
  it("renders children", () => {
    renderWithToast();

    expect(screen.getByTestId("show-error")).toBeTruthy();
  });

  it("shows error toast", () => {
    renderWithToast();

    fireEvent.press(screen.getByTestId("show-error"));

    expect(screen.getByTestId("snackbar")).toBeTruthy();
    expect(screen.getByText("Error occurred")).toBeTruthy();
  });

  it("shows success toast", () => {
    renderWithToast();

    fireEvent.press(screen.getByTestId("show-success"));

    expect(screen.getByText("Success!")).toBeTruthy();
  });

  it("shows info toast", () => {
    renderWithToast();

    fireEvent.press(screen.getByTestId("show-info"));

    expect(screen.getByText("Info message")).toBeTruthy();
  });

  it("defaults to info type when type not specified", () => {
    renderWithToast();

    fireEvent.press(screen.getByTestId("show-default"));

    expect(screen.getByText("Default type")).toBeTruthy();
  });

  it("queues new toast while previous toast stays visible", () => {
    renderWithToast();

    fireEvent.press(screen.getByTestId("show-error"));
    expect(screen.getByText("Error occurred")).toBeTruthy();

    fireEvent.press(screen.getByTestId("show-success"));
    const snackbars = screen.getAllByTestId("snackbar");

    expect(snackbars).toHaveLength(2);
    expect(screen.getByText("Error occurred")).toBeTruthy();
    expect(screen.getByText("Success!")).toBeTruthy();
  });
});

describe("useToast", () => {
  it("returns toast function", () => {
    let toastFn: ReturnType<typeof useToast>["toast"] | undefined;
    function Capturer() {
      const { toast } = useToast();
      React.useEffect(() => {
        toastFn = toast;
      }, [toast]);
      return null;
    }

    render(
      <ToastProvider>
        <Capturer />
      </ToastProvider>,
    );

    expect(typeof toastFn).toBe("function");
  });
});
