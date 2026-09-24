import type { Page } from '@playwright/test';
import { expect, quickAdd, settle, test } from '../e2e/fixtures';

/**
 * Visual regression (QUALITY.md §2): six screens in light and dark, compared with the baselines in
 * `__screenshots__`. They're made and compared on GitHub's Ubuntu runner only (`visual.yml`), since
 * other machines render text a little differently. The clock is fixed and the pictures are stubbed,
 * so a diff means the design changed.
 */
test.use({ serviceWorkers: 'block' });

const NOW = new Date('2026-09-24T10:00:00+02:00');

/** A small collection with prices: two cards bought, one priced, one without a price. */
async function seed(page: Page) {
  await quickAdd(page, ['150 26', '25 1', '4 2']);
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:150');
  await page.getByLabel('Neuer Preis').fill('34,9');
  await page.getByLabel('Neuer Preis').press('Enter');
  await expect(page.getByRole('region', { name: 'Aktueller Preis' })).toContainText('34,90');
  // No toast in the screenshots
  const toast = page.getByRole('dialog', { name: /^Preis gespeichert/ });
  await toast.getByRole('button', { name: 'Schließen' }).click();
  await expect(toast).toBeHidden();
}

async function shot(page: Page, name: string) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(scheme, () => {
    test.beforeEach(async ({ page }) => {
      await page.clock.install({ time: NOW });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    });

    test(`Übersicht, set, card and settings (${scheme})`, async ({ page }) => {
      await seed(page);
      await page.goto('/');
      await expect(page.getByRole('region', { name: /^Gesamtwert/ })).toContainText('34,90');
      await shot(page, `overview-${scheme}`);

      await page.goto('/catalog/sets/intl:30th');
      await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
      await shot(page, `set-${scheme}`);

      await page.goto('/catalog/sets/intl:30th/cards/intl:30th:150');
      await expect(page.getByRole('heading', { name: 'Pikachu-ex', level: 2 })).toBeVisible();
      await shot(page, `card-${scheme}`);

      await page.goto('/settings/appearance');
      await expect(page.getByRole('heading', { name: 'Darstellung', level: 2 })).toBeVisible();
      await shot(page, `settings-${scheme}`);
    });

    test(`the add sheet and the price session (${scheme})`, async ({ page }) => {
      await seed(page);
      await page.goto('/catalog/sets/intl:30th/cards/intl:30th:025');
      await page
        .getByRole('region', { name: /In deiner Sammlung/ })
        .getByRole('button', { name: 'Hinzufügen' })
        .click();
      const add = page.getByRole('dialog', { name: 'Karte hinzufügen' });
      await expect(add.getByLabel('Kaufpreis')).toBeFocused();
      await shot(page, `add-sheet-${scheme}`);
      await page.keyboard.press('Escape');
      await expect(add).toBeHidden();

      await page.goto('/prices');
      await page.getByRole('button', { name: 'Preis-Session starten' }).click();
      await expect(page.getByLabel('Neuer Preis')).toBeFocused();
      await shot(page, `price-session-${scheme}`);
    });
  });
}
