import {
  RESOURCE_REGISTRY,
  getResource,
  RESOURCE_KEYS,
} from "@/src/shared/domain/registry";

describe("RESOURCE_REGISTRY", () => {
  it("contains all expected resources", () => {
    const expectedKeys = [
      "patrimonios",
      "ambientes",
      "responsaveis",
      "conferentes",
      "fornecedores",
      "tipos-material",
      "estados-item",
      "audit-log",
    ];

    expect(Object.keys(RESOURCE_REGISTRY)).toEqual(expectedKeys);
  });

  it("each resource has label, mobileRoute, and apiPath", () => {
    for (const config of Object.values(RESOURCE_REGISTRY)) {
      expect(config.label).toBeDefined();
      expect(typeof config.label).toBe("string");
      expect(config.mobileRoute).toBeDefined();
      expect(typeof config.mobileRoute).toBe("string");
      expect(config.apiPath).toBeDefined();
      expect(config.apiPath.startsWith("/")).toBe(true);
    }
  });

  it("apiPath matches resource key convention", () => {
    expect(RESOURCE_REGISTRY["tipos-material"].apiPath).toBe("/tipo-material");
    expect(RESOURCE_REGISTRY["estados-item"].apiPath).toBe("/estados-item");
    expect(RESOURCE_REGISTRY["audit-log"].apiPath).toBe("/audit-log");
  });
});

describe("getResource", () => {
  it("returns config for valid key", () => {
    const result = getResource("patrimonios");

    expect(result.label).toBe("Patrimônios");
    expect(result.mobileRoute).toBe("Patrimonios");
    expect(result.apiPath).toBe("/patrimonios");
  });

  it("returns config for responsaveis", () => {
    const result = getResource("responsaveis");

    expect(result.label).toBe("Responsáveis");
    expect(result.mobileRoute).toBe("Responsaveis");
    expect(result.apiPath).toBe("/responsaveis");
  });
});

describe("RESOURCE_KEYS", () => {
  it("is array of all registry keys", () => {
    expect(RESOURCE_KEYS).toEqual(Object.keys(RESOURCE_REGISTRY));
  });

  it("has correct length", () => {
    expect(RESOURCE_KEYS.length).toBe(8);
  });
});
