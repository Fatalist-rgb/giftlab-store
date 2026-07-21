import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E (T030/T059). The suite runs against a production build with NO backend:
 * the /api/gl routes are mocked per-test, and without MEDUSA_* env the constructor
 * falls back to the local demo schema — fully deterministic in CI.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm next start -p 3100',
    url: 'http://localhost:3100/pl',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
