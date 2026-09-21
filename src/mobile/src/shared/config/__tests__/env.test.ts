describe("env", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when EXPO_PUBLIC_API_URL is not defined", () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    expect(() => require("@/src/shared/config/env")).toThrow(
      "Env EXPO_PUBLIC_API_URL não está definida.",
    );
  });

  it("exports apiBaseUrl when EXPO_PUBLIC_API_URL is defined", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:8000/api";

    const env = require("@/src/shared/config/env");

    expect(env.apiBaseUrl).toBe("http://localhost:8000/api");
  });

  it("preserves the exact value from EXPO_PUBLIC_API_URL", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://192.168.1.100:8000/api";

    const env = require("@/src/shared/config/env");

    expect(env.apiBaseUrl).toBe("http://192.168.1.100:8000/api");
  });
});
