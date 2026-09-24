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
    // Real WebKit (iPhone Safari engine) runs in CI; the sandbox has no WebKit build. CI renders it
    // in software (frames of 100-600 ms with the glass layers), so the longer journeys need more
    // than the default 30 s per test.
    ...(CI ? [{ name: 'webkit-phone', use: { ...devices['iPhone 15'] }, timeout: 60_000 }] : []),
    // Nightly only (e2e-nightly.yml): the data journeys in Firefox as well (M5 exit criterion).
    ...(process.env.NIGHTLY
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
          },
        ]
      : []),
  ],
});
