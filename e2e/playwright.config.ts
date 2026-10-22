import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 45000,
  expect: {
    timeout: 10000,
    // UI baselines (food-ui-quality-gates): only the container-rendered baselines are authoritative.
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  // Same name on every OS; baselines come from update-ui-baselines.sh (pinned image), never from a laptop.
  snapshotPathTemplate: '{testDir}/ui-baselines/{projectName}/{arg}{ext}',
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
      testIgnore: ['**/*.responsive.spec.ts', '**/*.mocked.spec.ts', '**/*.live.spec.ts', '**/*.ui.spec.ts', '**/permanent-food.spec.ts'],
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
      // Phone baseline for the Sticker redesign (food-ui-quality-gates): 390 x 844, touch, fixed locale and zone.
      name: 'ui-mobile',
      testMatch: '**/*.ui.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
      },
    },
    {
      name: 'ui-desktop',
      testMatch: '**/*.ui.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
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
