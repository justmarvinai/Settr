import { axeViolations, expect, test } from './fixtures';

const PAGES = [
  '/',
  '/collection/cards',
  '/catalog',
  '/catalog/sets/intl:30th',
  '/catalog/sets/asia:M6a?lang=ja&view=list',
  '/catalog/sets/intl:30th/cards/intl:30th:150',
  '/catalog/sets/asia:M6a/cards/asia:M6a:127?lang=zh-tw',
  '/catalog/sealed',
  '/catalog/sealed/intl:30th-etb',
  '/prices',
  '/portfolio',
  '/settings',
  '/settings/appearance',
  '/settings/data',
];

test.describe('pages', () => {
  // Without a service worker, the "offline ready" toast can't fade in at a random moment while
  // axe measures contrast. Toasts get their own test below, once they're fully visible.
  test.use({ serviceWorkers: 'block' });

  // One test per page and scheme, so each page has its own time budget (axe takes a while on a
  // full set page in WebKit) and a failure names its page.
  for (const scheme of ['light', 'dark'] as const) {
    for (const path of PAGES) {
      test(`no WCAG A/AA violations: ${path} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await axeViolations(page)).toEqual([]);
      });
    }
  }

  test('no violations with reduced transparency', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.getByRole('switch', { name: 'Transparenz reduzieren' }).click();
    await page.goto('/');
    expect(await axeViolations(page)).toEqual([]);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`toasts are accessible (${scheme})`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'the offline-ready toast needs a service worker install');
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    const toast = page.getByRole('dialog', { name: 'Settr ist jetzt offline verfügbar.' });
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await expect(toast.getByRole('button', { name: 'Schließen' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]); // waits for the entry animation first
    await toast.getByRole('button', { name: 'Schließen' }).click();
    await expect(toast).toBeHidden();
  });
}
