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

test('no violations with reduced transparency', async ({ page }) => {
  await page.goto('/settings/appearance');
  await page.getByRole('switch', { name: 'Transparenz reduzieren' }).click();
  await page.goto('/');
  expect(await axeViolations(page)).toEqual([]);
});
