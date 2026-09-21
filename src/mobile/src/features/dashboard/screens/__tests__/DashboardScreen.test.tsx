import React from "react";
import { render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import DashboardScreen from "../DashboardScreen";

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

jest.mock("../../hooks/useDashboard", () => ({
  useDashboard: () => ({
    stats: {
      totalPatrimonios: 1,
      totalAmbientes: 2,
      totalConferentes: 3,
      alertasAvaria: 4,
    },
    logs: [],
    loading: false,
    error: null,
    isRefreshing: false,
    load: jest.fn(),
    refresh: jest.fn(),
    retry: jest.fn(),
  }),
}));

jest.mock("../../components/DashboardCard", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    DashboardCard: ({ title }: { title: string }) =>
      React.createElement(Text, null, title),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<PaperProvider>{ui}</PaperProvider>);
}

describe("DashboardScreen", () => {
  it("keeps content below the Android status bar safe area", () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);

    expect(getByTestId("dashboard-scroll").props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingTop: mockTopInset }),
    );
  });
});
