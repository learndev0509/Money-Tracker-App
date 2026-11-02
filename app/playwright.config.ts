import { defineConfig } from '@playwright/test';
import { PHONE } from './e2e/helpers';

/*
 * Browser suites (e2e/*.spec.ts) against the production build.
 *   npm run e2e                 build dist/, serve it on 4173, run every spec
 *   npm run e2e -- fuel         only the specs whose file name contains "fuel"
 *   APP_URL=https://... npm run e2e   test a server that is already up (no build, no preview)
 *   npm run e2e -- --update-snapshots  accept new baselines for visual.spec.ts
 */
const PORT = 4173;
const baseURL = process.env.APP_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 45_000,
  expect: { timeout: 5_000, toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/visual/{arg}-{platform}{ext}',
  use: {
    ...PHONE,
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: process.env.APP_URL
    ? undefined
    : {
        // The build runs in the `e2e` script, not here: a preview server left running from an earlier run is
        // reused, and this command would then be skipped, so dist/ must already be fresh when it starts.
        command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `${baseURL}/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
