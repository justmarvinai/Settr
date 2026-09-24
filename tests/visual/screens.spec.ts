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

/**
 * The page shows the collection, not just the catalog: the backup pill has counted the changes and
 * the sidebar lists the set with its ring. IndexedDB answers after the catalog, so a screenshot
 * could otherwise catch a page without the lots. Call it before a sheet hides the rest of the page.
 */
async function collectionShown(page: Page) {
  await expect(page.getByRole('link', { name: /^Backup fällig/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^30 Jahre, Deutsch, Basis/ })).toBeVisible();
}

async function shot(page: Page, name: string) {
  // No hover state from wherever the last click happened
  await page.mouse.move(0, 0);
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
      await collectionShown(page);
      await shot(page, `overview-${scheme}`);

      await page.goto('/catalog/sets/intl:30th');
      await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
      await collectionShown(page);
      // 2 of the 128 Basis cards
      await expect(page.getByRole('main').locator('.progress-ring').first()).toHaveAttribute(
        'style',
        /--ring-value: 0\.015625/,
      );
      await shot(page, `set-${scheme}`);

      await page.goto('/catalog/sets/intl:30th/cards/intl:30th:150');
      await expect(page.getByRole('heading', { name: 'Pikachu-ex', level: 2 })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Aktueller Preis' })).toContainText('34,90');
      await collectionShown(page);
      await shot(page, `card-${scheme}`);

      await page.goto('/settings/appearance');
      await expect(page.getByRole('heading', { name: 'Darstellung', level: 2 })).toBeVisible();
      await collectionShown(page);
      await shot(page, `settings-${scheme}`);
    });

    test(`the add sheet and the price session (${scheme})`, async ({ page }) => {
      await seed(page);
      await page.goto('/catalog/sets/intl:30th/cards/intl:30th:025');
      await collectionShown(page);
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
      await collectionShown(page);
      await page.getByRole('button', { name: 'Preis-Session starten' }).click();
      await expect(page.getByLabel('Neuer Preis')).toBeFocused();
      await shot(page, `price-session-${scheme}`);
    });
  });
}
