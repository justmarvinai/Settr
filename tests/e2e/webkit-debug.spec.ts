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

const probe = (page: Page) =>
  page.evaluate(async () => {
    const el = document.querySelector('[aria-label="Alle sichtbaren Positionen auswählen"]');
    const frames: unknown[] = [];
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const r = el?.getBoundingClientRect();
      frames.push([
        Math.round(window.scrollY * 10) / 10,
        r ? [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10) : null,
        document.documentElement.scrollHeight,
      ]);
    }
    const cs = el ? getComputedStyle(el) : null;
    return {
      connected: el?.isConnected,
      count: document.querySelectorAll('[aria-label="Alle sichtbaren Positionen auswählen"]')
        .length,
      frames,
      style: cs ? [cs.visibility, cs.display, cs.opacity, cs.pointerEvents] : null,
      checkVisibility: el?.checkVisibility?.(),
      html: document.documentElement.getAttribute('style'),
      body: document.body.getAttribute('style'),
      locked: document.documentElement.hasAttribute('data-base-ui-scroll-locked'),
      dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => [
        d.getAttribute('aria-labelledby'),
        d.hasAttribute('data-open'),
        d.hasAttribute('data-ending-style'),
        d.className.slice(0, 40),
      ]),
      inert: [...document.querySelectorAll('[inert]')].map((e) => `${e.tagName}.${e.className}`),
      animations: document
        .getAnimations()
        .map((a) => [
          a.playState,
          (a.effect as KeyframeEffect | null)?.target?.className?.toString().slice(0, 40),
        ]),
      inner: [window.innerWidth, window.innerHeight, document.documentElement.clientWidth],
      url: location.pathname + location.search,
    };
  });

test('webkit: select-all after clearing filters', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'WebKit only');
  test.setTimeout(90_000);
  await page.goto('/settings/locations');
  await page.getByLabel('Name').fill('VaultX 9er');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByText(/^Ordner · 3 × 3/)).toBeVisible();
  await quickAdd(page, ['1', '4 2,50', '7x2', '25']);
  await quickAdd(page, ['25 3,00'], 'EN');

  await page.goto('/collection/cards');
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tabellenansicht' }).click();
  const table = page.getByRole('table', { name: 'Deine Karten' });
  await table.getByRole('button', { name: 'Karte' }).click();
  await page.getByRole('button', { name: 'Auswahl' }).click();
  const boxes = table.getByRole('checkbox', { name: / · NM auswählen$/ });
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  const bar = page.getByRole('region', { name: 'Auswahl' });
  await expect(bar).toContainText('2 ausgewählt');
  const selected = await probe(page);

  await bar.getByRole('button', { name: 'Tags …' }).click();
  const tags = page.getByRole('dialog', { name: 'Tags für 2 Positionen' });
  await tags.getByLabel('Neuer Tag').fill('Tauschordner');
  await tags.getByLabel('Neuer Tag').press('Enter');
  await tags.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByText('Tags bei 2 Positionen geändert')).toBeVisible();
  await bar.getByRole('button', { name: 'Verschieben …' }).click();
  const move = page.getByRole('dialog', { name: '2 Positionen verschieben' });
  await expect(move.getByLabel('Lagerort')).toHaveValue(/.+/);
  await move.getByRole('button', { name: 'Verschieben' }).click();
  await expect(page.getByText('2 Positionen nach VaultX 9er verschoben')).toBeVisible();
  const moved = await probe(page);

  await page.getByRole('button', { name: /^Filter/ }).click();
  const filters = page.getByRole('dialog', { name: 'Filter' });
  await filters.getByLabel('Tag').selectOption({ label: 'Tauschordner' });
  await filters.getByLabel('Lagerort').selectOption({ label: 'VaultX 9er' });
  await filters.getByRole('button', { name: '2 Positionen anzeigen' }).click();
  await expect(page.getByText('2 von 5 Positionen')).toBeVisible();
  const filtered = await probe(page);
  await page.getByRole('button', { name: 'Alle Filter entfernen' }).click();
  await expect(page.getByText('5 Positionen', { exact: true })).toBeVisible();
  const cleared = await probe(page);
  await page.waitForTimeout(3000);
  const later = await probe(page);

  let click = 'ok';
  try {
    await table
      .getByRole('checkbox', { name: 'Alle sichtbaren Positionen auswählen' })
      .click({ timeout: 5000 });
  } catch (error) {
    click = String(error).slice(0, 1500);
  }
  throw new Error(JSON.stringify({ selected, moved, filtered, cleared, later, click }, null, 1));
});
