import { defineConfig } from '@playwright/test';

export const API_URL = 'http://127.0.0.1:8870';
export const WEB_URL = 'http://localhost:3370';
export const MOBILE_URL = 'http://localhost:8170';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'api', testMatch: /api-.*\.spec\.ts/ },
    { name: 'web', testMatch: /web-.*\.spec\.ts/, use: { baseURL: WEB_URL, viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', testMatch: /mobile-.*\.spec\.ts/, use: { baseURL: MOBILE_URL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node support/api-server.cjs', url: `${API_URL}/health`, timeout: 120_000, reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 } },
    ...(process.env.E2E_API_ONLY === '1' ? [] : [
      { command: 'node support/ui-server.cjs web', url: `${WEB_URL}/login`, timeout: 240_000, reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 10_000 } },
      { command: 'node support/ui-server.cjs mobile', url: `${MOBILE_URL}/login`, timeout: 240_000, reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 10_000 } },
    ]),
  ],
});
