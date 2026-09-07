import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    screenshot: 'off',
    video: 'off',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      },
      testIgnore: ['**/*.responsive.spec.ts', '**/*.mocked.spec.ts', '**/*.live.spec.ts', '**/permanent-food.spec.ts'],
    },
    {
      name: 'mobile-320',
      testMatch: '**/*.responsive.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'tablet',
      testMatch: '**/*.responsive.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'desktop',
      testMatch: '**/*.responsive.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'mocked',
      testMatch: '**/*.mocked.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'live',
      testMatch: '**/*.live.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      },
    },
  ],
  outputDir: './test-results',
});
