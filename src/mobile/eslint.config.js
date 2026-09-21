const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const nodeGlobals = {
  __dirname: "readonly",
  __filename: "readonly",
  Buffer: "readonly",
  console: "readonly",
  module: "writable",
  process: "readonly",
  require: "readonly",
};

const jestGlobals = {
  afterAll: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  expect: "readonly",
  fail: "readonly",
  it: "readonly",
  jest: "readonly",
  test: "readonly",
};

module.exports = defineConfig([
  globalIgnores([
    ".expo/**",
    "coverage/**",
    "dist/**",
    "front_oficial/**",
    "node_modules/**",
  ]),

  expoConfig,

  {
    files: ["babel.config.js", "jest.config.js"],
    languageOptions: {
      globals: nodeGlobals,
    },
  },

  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    languageOptions: {
      globals: jestGlobals,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/first": "off",
    },
  },
]);
