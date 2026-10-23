export const preset = "jest-expo";
export const testMatch = [
  "**/__tests__/**/*.test.ts",
  "**/__tests__/**/*.test.tsx",
];
export const testPathIgnorePatterns = ["/node_modules/", "/front_oficial/"];
export const moduleFileExtensions = ["ts", "tsx", "js", "jsx", "json", "node"];
export const moduleNameMapper = {
  "^@/(.*)$": "<rootDir>/$1",
  "^@react-native-async-storage/async-storage$":
    "<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js",
};
export const collectCoverageFrom = [
  "src/**/*.{ts,tsx}",
  "!src/**/__tests__/**/*",
  "!src/**/index.{ts,tsx}",
];
