import React from "react";
import { render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import AdminHubScreen from "../AdminHubScreen";

const mockTopInset = 32;

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");

  return {
    SafeAreaInsetsContext: React.createContext({
      top: mockTopInset,
      right: 0,
      bottom: 0,
      left: 0,
    }),
    SafeAreaFrameContext: React.createContext({
      x: 0,
      y: 0,
      width: 320,
      height: 640,
    }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: mockTopInset, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<PaperProvider>{ui}</PaperProvider>);
}

describe("AdminHubScreen", () => {
  it("keeps content below the Android status bar safe area", () => {
    const { getByTestId } = renderWithProviders(<AdminHubScreen />);

    expect(getByTestId("admin-hub-container").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingTop: mockTopInset + 16 }),
      ]),
    );
  });
});
