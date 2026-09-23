// Temporary: diagnoses why WebKit never finds the table's select-all checkbox stable after the
// filters are cleared (collection.spec.ts). Removed again with the fix.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

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

test.use({ serviceWorkers: 'block' });

/** Whether the page still renders frames, how long one takes, and the box's position then. */
const probe = (page: Page) =>
  page.evaluate(async () => {
    const started = performance.now();
    const frame = await Promise.race([
      new Promise<string>((resolve) => {
        requestAnimationFrame(() =>
          resolve(`frame after ${Math.round(performance.now() - started)} ms`),
        );
      }),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('NO FRAME within 2000 ms'), 2000);
      }),
    ]);
    const el = document.querySelector('[aria-label="Alle sichtbaren Positionen auswählen"]');
    const r = el?.getBoundingClientRect();
    const active = document.activeElement;
    return {
      frame,
      visibility: document.visibilityState,
      focus: active ? `${active.tagName}[${active.getAttribute('aria-label') ?? ''}]` : null,
      rect: r ? [r.x, r.y, r.width, r.height].map((v) => Math.round(v)) : null,
      scrollY: Math.round(window.scrollY),
      toasts: document.querySelectorAll('.ui-toast').length,
      dialogs: document.querySelectorAll('.ui-dialog, .ui-sheet').length,
    };
  });

/** A copy of collection.spec.ts's Sammlung test up to the failing click, with probes. */
test('webkit: select-all after clearing filters', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'WebKit only');
  test.setTimeout(120_000);
  const stat = (label: string) => page.locator(`dt:text-is("${label}") + dd`);
  await page.goto('/settings/locations');
  await page.getByLabel('Name').fill('VaultX 9er');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByText(/^Ordner · 3 × 3/)).toBeVisible();
  await quickAdd(page, ['1', '4 2,50', '7x2', '25']);
  await quickAdd(page, ['25 3,00'], 'EN');

  await page.goto('/collection/cards');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
  await expect(stat('Exemplare')).toContainText('6');

  await page.getByRole('searchbox', { name: 'In deiner Sammlung suchen' }).fill('pikachu');
  await expect(page).toHaveURL(/q=pikachu/);
  await expect(page.getByText('2 von 5 Positionen')).toBeVisible();
  await page.getByRole('button', { name: /^Filter/ }).click();
  const filters = page.getByRole('dialog', { name: 'Filter' });
  await filters.getByLabel('Sprache').selectOption({ label: 'Englisch' });
  await expect(filters.getByRole('button', { name: '1 Position anzeigen' })).toBeVisible();
  await filters.getByRole('button', { name: '1 Position anzeigen' }).click();
  await expect(page).toHaveURL(/lang=en/);
  await page.getByRole('button', { name: 'Filter entfernen: Sprache: Englisch' }).click();
  await page.getByRole('searchbox', { name: 'In deiner Sammlung suchen' }).fill('');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Tabellenansicht' }).click();
  await expect(page).toHaveURL(/view=table/);
  const table = page.getByRole('table', { name: 'Deine Karten' });
  await table.getByRole('button', { name: 'Karte' }).click();
  await expect(page).toHaveURL(/sort=name/);

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
  await filters.getByLabel('Tag').selectOption({ label: 'Tauschordner' });
  await filters.getByLabel('Lagerort').selectOption({ label: 'VaultX 9er' });
  await filters.getByRole('button', { name: '2 Positionen anzeigen' }).click();
  await expect(page.getByText('2 von 5 Positionen')).toBeVisible();
  const filtered = await probe(page);
  await page.getByRole('button', { name: 'Alle Filter entfernen' }).click();
  const cleared = await probe(page);

  const header = table.getByRole('checkbox', { name: 'Alle sichtbaren Positionen auswählen' });
  let first = 'ok';
  try {
    await header.click({ timeout: 5000 });
  } catch (error) {
    first = String(error).slice(0, 900);
  }
  const afterFirst = await probe(page);
  await page.waitForTimeout(4000);
  const later = await probe(page);
  let second = 'ok';
  try {
    await header.click({ timeout: 5000 });
  } catch (error) {
    second = String(error).slice(0, 900);
  }
  const afterSecond = await probe(page);
  throw new Error(
    JSON.stringify({ filtered, cleared, first, afterFirst, later, second, afterSecond }, null, 1),
  );
});
