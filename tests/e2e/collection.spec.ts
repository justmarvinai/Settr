import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { axeViolations, expect, opened, pageTitle, test } from './fixtures';

/** Adds lots to 30 Jahre through Schnellerfassung (COL-06): `25`, `25x3`, `25 4,50`. */
async function quickAdd(page: Page, entries: readonly string[], language?: 'EN') {
  await page.goto('/catalog/sets/intl:30th');
  await page.getByRole('button', { name: 'Schnellerfassung' }).click();
  const sheet = page.getByRole('dialog', { name: 'Schnellerfassung' });
  if (language) await sheet.getByRole('radio', { name: language }).click();
  const input = sheet.getByLabel('Kartennummer');
  for (const entry of entries) {
    await input.fill(entry);
    await expect(sheet.getByText(/^⏎ fügt hinzu:/)).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveValue('');
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
}

// The service worker would fetch card pictures itself once it controls the page, past the
// fixtures' picture stubs; the PWA spec covers it.
test.use({ serviceWorkers: 'block' });

/** "In deiner Sammlung" on card and product pages. */
const holdings = (page: Page) => page.getByRole('region', { name: /In deiner Sammlung/ });

/** A stat of the summary above the lists, e.g. Exemplare. */
const stat = (page: Page, label: string) => page.locator(`dt:text-is("${label}") + dd`);

test('quick add on a set tile: one copy, a toast with undo and the badge', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th');
  await page.getByRole('button', { name: '025/128 Pikachu hinzufügen' }).click();
  await expect(page.getByText('Hinzugefügt: 025/128 Pikachu · DE · NM')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /^025\/128, Pikachu, .*1 im Besitz$/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByText('Rückgängig gemacht')).toBeVisible();
  await expect(page.getByRole('link', { name: /^025\/128, Pikachu, [^,]+$/ })).toBeVisible();
});

test('Q opens Schnellerfassung on a set page', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th');
  await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
  await page.keyboard.press('q');
  await expect(page.getByRole('dialog', { name: 'Schnellerfassung' })).toBeVisible();
});

test('add sheet with a price: Enter saves, the card page lists the lot', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:150');
  await holdings(page).getByRole('button', { name: 'Hinzufügen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Karte hinzufügen' });
  await expect(sheet.getByLabel('Kaufpreis')).toBeFocused();
  await page.keyboard.type('4,5');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Hinzugefügt: 150\/128 Pikachu-ex · DE · NM$/)).toBeVisible();
  await expect(sheet).toBeHidden();
  await expect(holdings(page)).toContainText('Einkauf 4,50 €');
});

test('Sammlung › Karten: summary, search, filters, table, tags, move and delete', async ({
  page,
}) => {
  await page.goto('/settings/locations');
  await page.getByLabel('Name').fill('VaultX 9er');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByText(/^Ordner · 3 × 3/)).toBeVisible();
  await quickAdd(page, ['1', '4 2,50', '7x2', '25']);
  await quickAdd(page, ['25 3,00'], 'EN');

  await page.goto('/collection/cards');
  await expect(pageTitle(page)).toHaveText('Sammlung');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
  await expect(stat(page, 'Exemplare')).toContainText('6');
  await expect(stat(page, 'Verschiedene Karten')).toContainText('4');
  await expect(stat(page, 'Investiert')).toContainText('5,50 €');

  // Search and filters live in the URL; active filters are chips.
  await page.getByRole('searchbox', { name: 'In deiner Sammlung suchen' }).fill('pikachu');
  await expect(page).toHaveURL(/q=pikachu/);
  await expect(page.getByText('2 von 5 Positionen')).toBeVisible();
  await page.getByRole('button', { name: /^Filter/ }).click();
  const filters = page.getByRole('dialog', { name: 'Filter' });
  await opened(filters);
  await filters.getByLabel('Sprache').selectOption({ label: 'Englisch' });
  await expect(filters.getByRole('button', { name: '1 Position anzeigen' })).toBeVisible();
  await filters.getByRole('button', { name: '1 Position anzeigen' }).click();
  await expect(page).toHaveURL(/lang=en/);
  await page.getByRole('button', { name: 'Filter entfernen: Sprache: Englisch' }).click();
  await page.getByRole('searchbox', { name: 'In deiner Sammlung suchen' }).fill('');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();

  // Table view, sorted by name from its header.
  await page.getByRole('button', { name: 'Tabellenansicht' }).click();
  await expect(page).toHaveURL(/view=table/);
  const table = page.getByRole('table', { name: 'Deine Karten' });
  await table.getByRole('button', { name: 'Karte' }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(table.getByRole('columnheader', { name: 'Karte' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );

  // Select two lots, tag them, move them into the binder.
  await page.getByRole('button', { name: 'Auswahl' }).click();
  const boxes = table.getByRole('checkbox', { name: / · NM auswählen$/ });
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  const bar = page.getByRole('region', { name: 'Auswahl' });
  await expect(bar).toContainText('2 ausgewählt');
  await bar.getByRole('button', { name: 'Tags …' }).click();
  const tags = page.getByRole('dialog', { name: 'Tags für 2 Positionen' });
  await tags.getByLabel('Neuer Tag').fill('Tauschordner');
  await tags.getByLabel('Neuer Tag').press('Enter');
  await expect(tags.getByRole('checkbox', { name: 'Tauschordner' })).toBeChecked();
  await tags.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByText('Tags bei 2 Positionen geändert')).toBeVisible();

  await bar.getByRole('button', { name: 'Verschieben …' }).click();
  const move = page.getByRole('dialog', { name: '2 Positionen verschieben' });
  await expect(move.getByLabel('Lagerort')).toHaveValue(/.+/);
  await move.getByRole('button', { name: 'Verschieben' }).click();
  await expect(page.getByText('2 Positionen nach VaultX 9er verschoben')).toBeVisible();

  await page.getByRole('button', { name: /^Filter/ }).click();
  await opened(filters);
  await filters.getByLabel('Tag').selectOption({ label: 'Tauschordner' });
  await filters.getByLabel('Lagerort').selectOption({ label: 'VaultX 9er' });
  // From the keyboard, like the header box below: after filter changes CI's software-rendered
  // WebKit sometimes stops producing frames for a while, and a click waits for frames.
  await filters.getByRole('button', { name: '2 Positionen anzeigen' }).press('Enter');
  await expect(page.getByText('2 von 5 Positionen')).toBeVisible();
  await page.getByRole('button', { name: 'Alle Filter entfernen' }).press('Enter');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(6); // the header and all five lots

  // Delete everything shown, then take it back. The header box works from the keyboard too; a
  // click here often hung in CI's WebKit (Playwright's stability check after the re-render).
  await table
    .getByRole('checkbox', { name: 'Alle sichtbaren Positionen auswählen' })
    .press('Space');
  await expect(bar).toContainText('5 ausgewählt');
  await bar.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('5 Positionen gelöscht')).toBeVisible();
  await expect(page.getByText('Noch keine Karten. Öffne ein Set und tippe auf ＋.')).toBeVisible();
  await page
    .getByRole('dialog', { name: '5 Positionen gelöscht' })
    .getByRole('button', { name: 'Rückgängig' })
    .click();
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
});

test('sell part of a lot and open a sealed product with pulls', async ({ page }) => {
  await quickAdd(page, ['25x3 2,00']);
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:025');
  await page
    .getByRole('button', { name: /^Aktionen für/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Verkaufen oder abgeben …' }).click();
  const sell = page.getByRole('dialog', { name: 'Verkaufen oder abgeben' });
  await sell.getByLabel('Verkaufspreis für alle').fill('3,5');
  await sell.getByRole('button', { name: 'Eintragen' }).click();
  await expect(page.getByText(/^Eingetragen:/)).toBeVisible();
  await expect(holdings(page)).toContainText('2 von 3');

  await page.goto('/catalog/sealed/intl:30th-etb');
  await holdings(page).getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByRole('dialog', { name: 'Sealed hinzufügen' })).toBeVisible();
  await page.keyboard.type('59,99');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Hinzugefügt:/)).toBeVisible();
  await page
    .getByRole('button', { name: /^Aktionen für/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Öffnen …' }).click();
  const open = page.getByRole('dialog', { name: 'Öffnen' });
  await open.getByRole('button', { name: 'Öffnen' }).click();
  await expect(open.getByRole('heading', { name: 'Pulls erfassen' })).toBeVisible();
  for (const number of ['150', '3']) {
    await open.getByLabel('Kartennummer').fill(number);
    await open.getByLabel('Kartennummer').press('Enter');
    await expect(open.getByLabel('Kartennummer')).toHaveValue('');
  }
  await open.getByRole('button', { name: 'Abschließen' }).click();
  await expect(page.getByText('Kosten auf 2 Pulls verteilt')).toBeVisible();

  await page.goto('/collection/sealed');
  await page.getByRole('button', { name: /^Filter/ }).click();
  await page.getByRole('dialog', { name: 'Filter' }).getByRole('switch').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: /Top-Trainer-Box.*Abgeschlossen$/ })).toBeVisible();
});

test('backup export downloads everything and resets the reminder', async ({ page }) => {
  // Phones would share the file; this checks the download that desktop (and fallback) uses.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined });
  });
  await quickAdd(page, ['25 4,50']);
  await page.goto('/settings/data');
  await expect(page.getByTestId('backup-status')).toHaveText('Noch kein Backup.');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup exportieren' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^settr-backup-\d{4}-\d{2}-\d{2}-\d{4}\.settr\.json$/,
  );
  const backup = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    format: string;
    counts: { holdings: number };
    checksum: { algorithm: string; value: string };
    data: { holdings: { acquisition: { priceTotal?: { minor: number } } }[] };
  };
  expect(backup.format).toBe('settr-backup');
  expect(backup.counts.holdings).toBe(1);
  expect(backup.checksum.value).toMatch(/^[0-9a-f]{64}$/);
  expect(backup.data.holdings[0]?.acquisition.priceTotal?.minor).toBe(450);
  await expect(page.getByText('Backup-Download gestartet')).toBeVisible();
  await expect(page.getByTestId('backup-status')).toHaveText(/^Letztes Backup heute, am /);
});

test('owned:ja and owned:nein narrow the card search to the collection', async ({ page }) => {
  await quickAdd(page, ['150']);
  await page.goto(`/catalog/cards?q=${encodeURIComponent('pikachu owned:ja')}`);
  const results = page.getByRole('link', { name: /Pikachu/ });
  await expect(results).toHaveCount(1);
  await expect(results.first()).toHaveAccessibleName(/^150\/128, Pikachu-ex/);

  await page.goto(`/catalog/cards?q=${encodeURIComponent('pikachu owned:nein')}`);
  await expect(page.getByRole('link', { name: /^150\/128, Pikachu-ex/ })).toBeHidden();
  await expect(page.getByRole('link', { name: /Pikachu/ }).first()).toBeVisible();
});

test.describe('accessibility with a collection', () => {
  // One test per screen group and scheme, so each gets its own time budget (axe is slow in WebKit).
  test.beforeEach(({ browserName }) => {
    test.slow(browserName === 'webkit', 'axe takes several seconds per page in WebKit');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`Sammlung lists have no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await quickAdd(page, ['1', '4 2,50', '25']);

      await page.goto('/collection/cards');
      await expect(page.getByText('3 Positionen', { exact: true })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);

      await page.goto('/collection/cards?view=table&group=rarity');
      await expect(page.getByRole('table', { name: 'Deine Karten' })).toBeVisible();
      await page.getByRole('button', { name: 'Auswahl' }).click();
      await page
        .getByRole('checkbox', { name: / · NM auswählen$/ })
        .first()
        .click();
      await expect(page.getByRole('region', { name: 'Auswahl' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test(`Sammlung dialogs have no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await quickAdd(page, ['1', '25']);

      await page.goto('/collection/cards?view=table');
      await page.getByRole('button', { name: 'Auswahl' }).click();
      await page
        .getByRole('checkbox', { name: / · NM auswählen$/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Tags …' }).click();
      await expect(page.getByRole('dialog', { name: 'Tags für 1 Position' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /^Filter/ }).click();
      await expect(page.getByRole('dialog', { name: 'Filter' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test(`a collected set has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await quickAdd(page, ['1']);
      await page.goto('/catalog/sets/intl:30th');
      await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});
