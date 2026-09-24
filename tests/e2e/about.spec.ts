import { expect, test } from './fixtures';

test('Über & Rechtliches: version, sources, privacy, disclaimer and shortcuts (APP-08)', async ({
  page,
}) => {
  await page.goto('/settings/about');
  await expect(page.getByRole('heading', { name: 'Settr', level: 2 })).toBeVisible();
  await expect(page.getByText(/^\d+\.\d+\.\d+(?: \([0-9a-f]{7}\))?$/)).toBeVisible();
  await expect(page.getByText(/^\d{4}\.\d{2}\.\d{2}\.\d+ vom \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
  for (const section of ['Datenquellen', 'Schriften und Open Source', 'Datenschutz', 'Rechtliches'])
    await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: /^TCGdex/ })).toHaveAttribute(
    'href',
    'https://tcgdex.dev',
  );
  await expect(page.getByText(/inoffizielles Fanprojekt/)).toBeVisible();
  await expect(page.getByText(/Kein Konto, kein Tracking/)).toBeVisible();

  await page.getByRole('button', { name: 'Tastenkürzel' }).click();
  await expect(page.getByRole('dialog', { name: 'Tastenkürzel' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Tastenkürzel' })).toBeHidden();
});

test('the license texts open as a file, also with the service worker in charge', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'the service worker installs in Chromium');
  await page.goto('/settings/about');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const [tab] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: /^Alle Lizenztexte/ }).click(),
  ]);
  await tab.waitForLoadState();
  expect(new URL(tab.url()).pathname).toBe('/licenses.txt');
  await expect(tab.locator('body')).toContainText('react 19');
  await expect(tab.locator('body')).toContainText('SIL OPEN FONT LICENSE');
  await expect(tab.locator('body')).toContainText('Apache License');
});
