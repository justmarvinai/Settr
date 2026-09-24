import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// The cloud sandbox ships its own Chromium build; CI installs Playwright's browsers.
const executablePath = process.env.CHROMIUM_PATH;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  // Visual baselines (tests/visual): one set, made on GitHub's Ubuntu runner (visual.yml)
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // Baselines and comparisons run on the same runner, so stray antialiasing stays far below
      // this; a missing line of text (a few hundred pixels) doesn't (ADR-049).
      maxDiffPixels: 100,
    },
  },
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
    // Nightly only (e2e-nightly.yml): every journey in Firefox and on an Android phone as well.
    ...(process.env.NIGHTLY
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
          },
          { name: 'pixel', use: { ...devices['Pixel 7'], ...chromiumLaunch } },
        ]
      : []),
    // Visual regression (visual.yml): desktop Chromium, light and dark.
    ...(process.env.VISUAL
      ? [
          {
            name: 'visual',
            testDir: 'tests/visual',
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1440, height: 900 },
              ...chromiumLaunch,
            },
          },
        ]
      : []),
  ],
});
