import { axeViolations, expect, test } from './fixtures';

const PAGES = [
  '/',
  '/collection/cards',
  '/catalog',
  '/prices',
  '/portfolio',
  '/settings',
  '/settings/appearance',
  '/settings/data',
];

for (const scheme of ['light', 'dark'] as const) {
  test(`no WCAG A/AA violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await axeViolations(page), `${path} (${scheme})`).toEqual([]);
    }
  });
}

test('toasts are accessible', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'the offline-ready toast needs a service worker install');
  await page.goto('/');
  const toast = page.getByRole('dialog', { name: 'Settr ist jetzt offline verfügbar.' });
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await expect(toast.getByRole('button', { name: 'Schließen' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await toast.getByRole('button', { name: 'Schließen' }).click();
  await expect(toast).toBeHidden();
});

test('no violations with reduced transparency', async ({ page }) => {
  await page.goto('/settings/appearance');
  await page.getByRole('switch', { name: 'Transparenz reduzieren' }).click();
  await page.goto('/');
  expect(await axeViolations(page)).toEqual([]);
});
