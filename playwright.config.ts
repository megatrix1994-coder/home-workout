import { defineConfig, devices } from '@playwright/test';
import { ADMIN_STATE } from './e2e/global-setup';

// Runs against a running production build (see README "Production build").
// Set E2E_BASE_URL to aim at another address, for example the Vite dev server.
// Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to an admin account on that server.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    storageState: ADMIN_STATE,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
