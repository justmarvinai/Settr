import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { canonicalJson } from '../../src/domain/backup/canonical';
import { axeViolations, expect, quickAdd, test } from './fixtures';

interface Lot {
  id: string;
  updatedAt: string;
  note?: string;
  snapshot: { localId?: string };
}
interface Backup {
  format: string;
  counts: Record<string, number>;
  checksum: { algorithm: string; value: string };
  installId: string;
  data: { holdings: Lot[]; tombstones: { id: string; table: string; deletedAt: string }[] };
}

// The service worker would fetch pictures itself, past the stubs.
test.use({ serviceWorkers: 'block' });

// Phones would share the file; downloads are what desktop (and the fallback) use.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined });
  });
});

const PIKACHU_EX = '/catalog/sets/intl:30th/cards/intl:30th:150';
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Backup einspielen' });

async function exportBackup(page: Page): Promise<{ path: string; backup: Backup }> {
  await page.goto('/settings/data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup exportieren' }).click();
  const path = await (await downloading).path();
  const backup = JSON.parse(await readFile(path, 'utf8')) as Backup;
  // Dismissed, as on a phone it covers the end of the page for its 8 seconds.
  const toast = page.locator('.ui-toast').filter({ hasText: 'Backup-Download gestartet' });
  await toast.getByRole('button', { name: 'Schließen' }).click();
  await expect(toast).toBeHidden();
  return { path, backup };
}

async function pickFile(page: Page, file: string | { name: string; buffer: Buffer }) {
  await page.goto('/settings/data');
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(
    typeof file === 'string' ? file : { ...file, mimeType: 'application/json' },
  );
}

/** A valid UUIDv7 like `id` but with other random bits (a record the other device made). */
const otherId = (id: string) =>
  `${id.slice(0, 24)}${'0123456789ab'.split('').toReversed().join('')}`;

const lotOf = (backup: Backup, number: string) => {
  const lot = backup.data.holdings.find((h) => h.snapshot.localId === number);
  if (!lot) throw new Error(`no lot ${number}`);
  return lot;
};

test('export → delete all data → import gives back exactly the same data', async ({ page }) => {
  await quickAdd(page, ['25 4,50', '150 26']);
  await page.goto(PIKACHU_EX);
  const price = page.getByRole('region', { name: 'Aktueller Preis' });
  await expect(price).toContainText('Noch kein Preis eingetragen');
  await page.getByLabel('Neuer Preis').fill('34,9');
  await page.getByLabel('Neuer Preis').press('Enter');
  await expect(price).toContainText(/34,90\s€/);

  const first = await exportBackup(page);
  expect(first.backup.counts).toMatchObject({ holdings: 2, prices: 1 });

  // Alle Daten löschen, behind the typed confirmation.
  await page.getByRole('button', { name: 'Alle Daten löschen …' }).click();
  const wipe = page.getByRole('dialog', { name: 'Wirklich alle Daten löschen?' });
  const submit = wipe.getByRole('button', { name: 'Endgültig löschen' });
  await expect(submit).toBeDisabled();
  await wipe.getByLabel('Tippe LÖSCHEN zur Bestätigung').fill('löschen');
  await submit.click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/collection/cards');
  await expect(page.getByText(/^Noch keine Karten/)).toBeVisible();

  await pickFile(page, first.path);
  await expect(dialog(page)).toContainText('2 Positionen · 1 Preis');
  await expect(dialog(page)).toContainText('Prüfsumme');
  await expect(dialog(page)).toContainText('In Ordnung');
  await expect(dialog(page)).toContainText('Auf diesem Gerät sind noch keine Daten.');
  await dialog(page).getByRole('button', { name: 'Einspielen' }).click();
  await expect(page.getByText('Backup eingespielt')).toBeVisible();

  // The same data, byte for byte: a second export has the same checksum over its data.
  const second = await exportBackup(page);
  expect(second.backup.checksum.value).toBe(first.backup.checksum.value);
  expect(second.backup.counts).toEqual(first.backup.counts);
  await page.goto(PIKACHU_EX);
  await expect(page.getByRole('region', { name: 'Aktueller Preis' })).toContainText(/34,90\s€/);
});

test('merge with conflicts: newer wins, deletions travel, undo restores', async ({ page }) => {
  await quickAdd(page, ['1 1', '4 2', '25 1,5']);
  const { backup } = await exportBackup(page);

  // The other device: edited #001 later, #004 earlier, deleted #025, added a copy of #001.
  const later = new Date(Date.now() + 60_000).toISOString();
  const one = lotOf(backup, '001');
  const four = lotOf(backup, '004');
  const gone = lotOf(backup, '025');
  const theirs = structuredClone(backup);
  theirs.installId = otherId(backup.installId);
  theirs.data.holdings = [
    { ...one, note: 'Vom anderen Gerät', updatedAt: later },
    { ...four, note: 'Alte Fassung', updatedAt: '2026-01-02T10:00:00.000Z' },
    { ...one, id: otherId(one.id), note: 'Neu dort' },
  ];
  theirs.data.tombstones = [{ id: gone.id, table: 'holdings', deletedAt: later }];
  theirs.counts = { ...theirs.counts, holdings: 3, tombstones: 1 };
  theirs.checksum.value = createHash('sha256').update(canonicalJson(theirs.data)).digest('hex');

  await pickFile(page, {
    name: 'anderes-geraet.settr.json',
    buffer: Buffer.from(JSON.stringify(theirs)),
  });
  await expect(dialog(page)).toContainText('Ein anderes Gerät');
  await expect(dialog(page).getByRole('radio', { name: 'Zusammenführen' })).toBeChecked();
  const summary = dialog(page).getByTestId('merge-summary');
  await expect(summary).toContainText(/Neu\s*1/);
  await expect(summary).toContainText(/Aktualisiert\s*1/);
  await expect(summary).toContainText(/Gelöscht\s*1/);
  await expect(dialog(page)).toContainText('1 Eintrag ist hier neuer und bleibt, wie er ist.');
  await dialog(page).getByRole('button', { name: 'Zusammenführen' }).click();
  await expect(page.getByText('Neu: 1 · Aktualisiert: 1 · Gelöscht: 1')).toBeVisible();

  const merged = (await exportBackup(page)).backup;
  const notes = merged.data.holdings.map((h) => h.note ?? '').toSorted();
  expect(notes).toEqual(['', 'Neu dort', 'Vom anderen Gerät'].toSorted());
  expect(merged.data.holdings.some((h) => h.id === gone.id)).toBe(false);
  expect(merged.data.tombstones.map((t) => t.id)).toEqual([gone.id]);

  // The snapshot before the import lists under Sicherungen vor Importen and puts it all back.
  const snapshots = page.getByRole('list', { name: 'Sicherungen vor Importen' });
  await expect(snapshots).toContainText('Vor dem Import von anderes-geraet.settr.json');
  await snapshots.getByRole('button', { name: 'Wiederherstellen' }).first().click();
  await page
    .getByRole('dialog', { name: 'Diesen Stand wiederherstellen?' })
    .getByRole('button', { name: 'Wiederherstellen' })
    .click();
  await expect(page.getByText(/^Stand vom .* wiederhergestellt$/)).toBeVisible();
  const restored = (await exportBackup(page)).backup;
  expect(restored.checksum.value).toBe(backup.checksum.value);
});

test('a broken file, a newer backup and an edited one are explained', async ({ page }) => {
  await pickFile(page, {
    name: 'kaputt.json',
    buffer: Buffer.from('{\n  "format": "settr-backup",\n  x\n}'),
  });
  await expect(page.getByRole('alert')).toHaveText(
    'Die Datei ist kein gültiges JSON (Zeile 3, Spalte 3). Vielleicht ist sie beschädigt oder unvollständig.',
  );

  const newer = {
    format: 'settr-backup',
    formatVersion: 1,
    schemaVersion: 99,
    app: { version: '3.0.0' },
    data: {},
  };
  await pickFile(page, { name: 'neu.settr.json', buffer: Buffer.from(JSON.stringify(newer)) });
  await expect(page.getByRole('alert')).toHaveText(
    'Das Backup stammt aus Settr 3.0.0. Bitte Settr aktualisieren, dann klappt der Import.',
  );

  await quickAdd(page, ['25']);
  const { backup } = await exportBackup(page);
  const edited = structuredClone(backup);
  (edited.data.holdings[0] as unknown as { quantity: number }).quantity = 0;
  await pickFile(page, {
    name: 'bearbeitet.settr.json',
    buffer: Buffer.from(JSON.stringify(edited)),
  });
  await expect(dialog(page)).toContainText('Datei wurde verändert');
  await expect(dialog(page)).toContainText('1 Eintrag ist fehlerhaft und wird übersprungen.');
  await dialog(page).getByRole('button', { name: 'Welche?' }).click();
  await expect(dialog(page)).toContainText('Positionen, Nr. 1');
  await dialog(page).getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog(page)).toBeHidden();
});

test.describe('accessibility of the Daten page', () => {
  test.beforeEach(({ browserName }) => {
    test.slow(browserName === 'webkit', 'axe takes several seconds per page in WebKit');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`Daten, the import preview and the delete dialog pass axe (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await quickAdd(page, ['25 1', '150']);
      const { path } = await exportBackup(page);
      await pickFile(page, path);
      await expect(dialog(page).getByTestId('merge-summary')).toBeVisible();
      expect(await axeViolations(page), 'import preview').toEqual([]);
      await dialog(page).getByRole('button', { name: 'Zusammenführen' }).click();
      await expect(page.getByText('Backup eingespielt')).toBeVisible();
      await expect(page.getByRole('list', { name: 'Sicherungen vor Importen' })).toBeVisible();
      expect(await axeViolations(page), 'Daten page').toEqual([]);

      await page.getByRole('button', { name: 'Alle Daten löschen …' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Wirklich alle Daten löschen?' }),
      ).toBeVisible();
      expect(await axeViolations(page), 'delete dialog').toEqual([]);
    });
  }
});
