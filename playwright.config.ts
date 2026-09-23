import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// The cloud sandbox ships its own Chromium build; CI installs Playwright's browsers.
const executablePath = process.env.CHROMIUM_PATH;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0, // a flaky test is a bug to fix, not to retry (QUALITY.md §5)
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !CI,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        ...chromiumLaunch,
      },
    },
    { name: 'phone', use: { ...devices['iPhone 15'], browserName: 'chromium', ...chromiumLaunch } },
    // Real WebKit (iPhone Safari engine) runs in CI; the sandbox has no WebKit build.
    ...(CI ? [{ name: 'webkit-phone', use: { ...devices['iPhone 15'] } }] : []),
  ],
});
