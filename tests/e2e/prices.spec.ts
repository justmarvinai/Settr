import type { Page } from '@playwright/test';
import { axeViolations, expect, quickAdd, test } from './fixtures';

// The service worker would fetch the price guide and pictures itself, past the stubs below.
test.use({ serviceWorkers: 'block' });

const PIKACHU_EX = '/catalog/sets/intl:30th/cards/intl:30th:150';
/** Money as Settr writes it, `34,90 €` with a no-break space; `amount` is a regex source. */
const eur = (amount: string) => new RegExp(`${amount}\\s€`);

const panel = (page: Page) => page.getByRole('region', { name: 'Aktueller Preis' });
const holdings = (page: Page) => page.getByRole('region', { name: /In deiner Sammlung/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Preis eintragen' });

/** A price-guide snapshot made today, for Pikachu-ex (Cardmarket 907757). */
async function stubGuide(page: Page) {
  const today = new Date().toISOString().slice(0, 10);
  await page.route('**/catalog/v1/cm-prices.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'cardmarket-price-guide',
        guideCreatedAt: `${today}T02:48:12+0200`,
        fetchedAt: `${today}T03:30:00Z`,
        prices: { '907757': { low: 28.5, trend: 31.2 } },
      }),
    }),
  );
}

test('a price on the card page: P, amount, Enter; the lot shows its P/L; undo removes it', async ({
  page,
}) => {
  await quickAdd(page, ['150 26']);
  await page.goto(PIKACHU_EX);
  await expect(panel(page)).toContainText('Noch kein Preis eingetragen');
  await page.keyboard.press('p'); // P records a price for the page's card (UX_SPEC.md §7)
  await expect(page.getByLabel('Neuer Preis')).toBeFocused();
  await page.keyboard.type('34,9');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(/^Preis gespeichert: 34,90\s€ · 150\/128 Pikachu-ex · DE$/),
  ).toBeVisible();
  await expect(panel(page)).toContainText(eur('34,90'));
  await expect(page.getByRole('heading', { name: /^Einträge/ })).toContainText('1');
  // 34,90 € against 26,00 € paid.
  await expect(holdings(page)).toContainText(eur('\\+8,90'));

  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(panel(page)).toContainText('Noch kein Preis eingetragen');
});

test('P on a set tile opens the price sheet; U confirms the last price for today', async ({
  page,
}) => {
  await quickAdd(page, ['25']);
  await page.goto('/catalog/sets/intl:30th');
  const tile = page.getByRole('link', { name: /^025\/128, Pikachu,/ });

  await tile.focus();
  await page.keyboard.press('p');
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByLabel('Neuer Preis')).toBeFocused();
  await sheet(page).getByLabel('Datum').fill('2026-09-01');
  await sheet(page).getByLabel('Neuer Preis').fill('0,5');
  await sheet(page).getByLabel('Neuer Preis').press('Enter');
  await expect(sheet(page)).toBeHidden();
  await expect(
    page.getByText(/^Preis gespeichert: 0,50\s€ · 025\/128 Pikachu · DE$/),
  ).toBeVisible();

  await tile.focus();
  await page.keyboard.press('p');
  await expect(sheet(page).getByRole('button', { name: /^Unverändert · 0,50/ })).toBeVisible();
  await page.keyboard.press('u');
  await expect(sheet(page)).toBeHidden();
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:025');
  await expect(page.getByRole('heading', { name: /^Einträge/ })).toContainText('2');
});

test('price-guide chips copy a value, saved as the guide’s', async ({ page }) => {
  await stubGuide(page);
  await page.goto(PIKACHU_EX);
  await expect(
    page.getByText(/^Cardmarket-Preisführer vom .* alle Sprachen, Länder und Zustände$/),
  ).toBeVisible();
  await page.getByRole('button', { name: /^ab 28,50\s€ aus dem Preisführer übernehmen$/ }).click();
  await expect(page.getByLabel('Neuer Preis')).toHaveValue('28,50');
  await page.keyboard.press('Enter');
  await expect(panel(page)).toContainText('Preisführer ab');

  // V in the field copies the first suggestion; a changed amount is the user's own.
  await page.getByLabel('Neuer Preis').press('v');
  await expect(page.getByLabel('Neuer Preis')).toHaveValue('28,50');
  await page.getByLabel('Neuer Preis').fill('29');
  await page.keyboard.press('Enter');
  await expect(panel(page)).toContainText('ab (DE)');
});

test('the price session prices a series per step and sums up what changed', async ({ page }) => {
  await quickAdd(page, ['1 1', '4 2', '25 1,5']);
  await page.goto('/prices');
  await expect(page.locator('dt:text-is("Ohne Preis") + dd')).toHaveText('3');
  await page.getByRole('button', { name: 'Preis-Session starten' }).click();
  await expect(page.getByText('1 von 3')).toBeVisible();

  const amount = page.getByLabel('Neuer Preis');
  await expect(amount).toBeFocused();
  await amount.fill('2');
  await amount.press('Enter');
  await expect(page.getByText('2 von 3')).toBeVisible();
  await expect(amount).toBeFocused();
  await amount.press('s'); // S skips
  await expect(page.getByText('3 von 3')).toBeVisible();
  await amount.fill('1,5');
  await amount.press('Enter');

  await expect(page.getByRole('heading', { name: 'Geschafft' })).toBeVisible();
  await expect(page.getByText('2 Preise eingetragen')).toBeVisible();
  await expect(page.getByText('1 übersprungen')).toBeVisible();
  await expect(page.getByText(eur('\\+3,50'))).toBeVisible();
  await page.getByRole('button', { name: 'Fertig' }).click();
  await expect(page).toHaveURL(/\/prices$/);
  await expect(page.locator('dt:text-is("Ohne Preis") + dd')).toHaveText('1');
});

test('Übersicht, Sammlung and Portfolio add up the same prices', async ({ page }) => {
  await quickAdd(page, ['150 26', '25 1']);
  await page.goto('/catalog/sets/intl:30th');
  for (const [name, price] of [
    [/^150\/128, Pikachu-ex,/, '34,9'],
    [/^025\/128, Pikachu,/, '0,4'],
  ] as const) {
    await page.getByRole('link', { name }).focus();
    await page.keyboard.press('p');
    await sheet(page).getByLabel('Neuer Preis').fill(price);
    await sheet(page).getByLabel('Neuer Preis').press('Enter');
    await expect(sheet(page)).toBeHidden();
  }

  // 34,90 + 0,40 = 35,30 € worth; 27,00 € paid; +8,30 €.
  await page.goto('/');
  const hero = page.getByRole('region', { name: /^Gesamtwert/ });
  await expect(hero).toContainText(eur('35,30'));
  await expect(hero).toContainText(eur('\\+8,30'));
  await expect(hero).toContainText(/Investiert 27,00\s€/);

  await page.goto('/collection/cards');
  await expect(page.locator('dt:text-is("Wert") + dd')).toHaveText(eur('35,30'));

  await page.goto('/portfolio');
  await expect(page.getByRole('region', { name: /^Gesamtwert/ })).toContainText(eur('35,30'));
  await page
    .getByRole('radiogroup', { name: 'Aufteilen nach' })
    .getByRole('radio', { name: 'Sprache' })
    .click();
  await expect(page).toHaveURL(/by=language/);
  await expect(page.getByRole('region', { name: 'Aufteilung' })).toContainText('Deutsch');
  await expect(page.getByRole('region', { name: 'Performance' })).toContainText('30 Jahre');
});

test.describe('accessibility with prices', () => {
  test.beforeEach(({ browserName }) => {
    test.slow(browserName === 'webkit', 'axe takes several seconds per page in WebKit');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`price views have no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await stubGuide(page);
      await quickAdd(page, ['150 26', '25']);
      await page.goto(PIKACHU_EX);
      await page.getByLabel('Neuer Preis').fill('34,9');
      await page.getByLabel('Neuer Preis').press('Enter');
      await expect(panel(page)).toContainText(eur('34,90'));
      expect(await axeViolations(page)).toEqual([]);

      for (const path of ['/', '/prices', '/portfolio']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        expect(await axeViolations(page), path).toEqual([]);
      }

      await page.getByRole('link', { name: 'Preise' }).first().click();
      await page.getByRole('button', { name: 'Preis-Session starten' }).click();
      await expect(page.getByLabel('Neuer Preis')).toBeFocused();
      expect(await axeViolations(page), 'session').toEqual([]);

      await page.goto('/catalog/sets/intl:30th');
      await page.getByRole('link', { name: /^150\/128, Pikachu-ex,/ }).focus();
      await page.keyboard.press('p');
      await expect(sheet(page).getByLabel('Neuer Preis')).toBeFocused();
      expect(await axeViolations(page), 'sheet').toEqual([]);
    });
  }
});
