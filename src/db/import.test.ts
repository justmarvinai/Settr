import { readFileSync } from 'node:fs';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canonicalJson, readBackup, type BackupData, type BackupTables } from '@/domain/backup';
import { DEFAULT_SETTINGS } from '@/domain/schemas';
import { sha256Hex } from '@/lib/hash';
import { holding, location, price, tablesArb, tag, tombstone } from '../../tests/factories';
import {
  createBackup,
  getDataVersion,
  getMeta,
  importBackup,
  KEEP_SNAPSHOTS,
  listSnapshots,
  previewMerge,
  readUserData,
  restoreSnapshot,
  SettrDB,
  SnapshotDB,
  toMediaRow,
  wipeAll,
} from './index';

const APP = { appVersion: '0.5.0', catalogVersion: '2026.09.23.5' };
const FIXTURE = 'tests/fixtures/backups/v1/basic.settr.json';

let n = 0;
const open: (SettrDB | SnapshotDB)[] = [];
function fresh() {
  const db = new SettrDB(`settr-import-${++n}`);
  const snaps = new SnapshotDB(`settr-snapshots-${n}`);
  open.push(db, snaps);
  return { db, snaps };
}

let db: SettrDB;
let snaps: SnapshotDB;
beforeEach(() => {
  ({ db, snaps } = fresh());
});
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

/** Writes records straight into the tables (any valid data, not only what the UI makes). */
async function seed(target: SettrDB, tables: Partial<BackupData>) {
  await target.holdings.bulkPut(tables.holdings ?? []);
  await target.prices.bulkPut(tables.prices ?? []);
  await target.wishlist.bulkPut(tables.wishlist ?? []);
  await target.tags.bulkPut(tables.tags ?? []);
  await target.locations.bulkPut(tables.locations ?? []);
  await target.customItems.bulkPut(tables.customItems ?? []);
  await target.media.bulkPut((tables.media ?? []).map(toMediaRow));
  await target.tombstones.bulkPut(tables.tombstones ?? []);
  if (tables.settings) await target.kv.put({ key: 'settings', value: tables.settings });
  if (tables.overrides) {
    await target.kv.put({ key: 'overrides:cardmarket', value: tables.overrides.cardmarket });
  }
}

async function readFile(text: string) {
  const result = await readBackup(text, sha256Hex);
  if (!result.ok) throw new Error(`unreadable: ${result.error.kind}`);
  return result.backup;
}

const sorted = (tables: BackupTables | BackupData) =>
  canonicalJson(
    Object.fromEntries(
      Object.entries(tables).map(([k, v]) => [
        k,
        Array.isArray(v) ? (v as { id: string }[]).toSorted((a, b) => (a.id < b.id ? -1 : 1)) : v,
      ]),
    ),
  );

describe('export → import (replace) round trip', () => {
  it('reproduces exactly the same data on an empty device (property)', async () => {
    await fc.assert(
      fc.asyncProperty(tablesArb, async (tables) => {
        const source = fresh();
        const target = fresh();
        await seed(source.db, {
          ...tables,
          settings: { ...DEFAULT_SETTINGS, defaultCardLanguage: 'en' },
          overrides: { cardmarket: { 'card|intl:30th:025|de|normal': 907_000 } },
        });
        const exported = await createBackup(source.db, APP);
        const backup = await readFile(JSON.stringify(exported));
        expect(backup.checksum).toBe('ok');
        expect(backup.invalid).toBe(0);

        await importBackup(target.db, target.snaps, {
          mode: 'replace',
          data: backup.data,
          app: APP,
        });
        const again = await createBackup(target.db, APP);
        expect(sorted(again.data)).toBe(sorted(exported.data));
        expect(again.checksum.value).toBe(exported.checksum.value);
        expect(await target.db.priceLatest.count()).toBe(
          new Set(tables.prices.map((p) => p.seriesKey)).size,
        );
      }),
      { seed: 20260924, numRuns: 25 },
    );
  });

  it('replaces everything, keeps a snapshot, and counts the file as the latest backup', async () => {
    await seed(db, { holdings: [holding(), holding()], tags: [tag('Alt')] });
    await db.kv.put({ key: 'priceSession', value: { scope: 'stale' } });
    const before = await getDataVersion(db);
    const incoming = await readFile(readFileSync(FIXTURE, 'utf8'));

    const outcome = await importBackup(db, snaps, {
      mode: 'replace',
      data: incoming.data,
      exportedAt: incoming.header.exportedAt,
      label: 'basic.settr.json',
      app: APP,
    });

    expect(sorted(await readUserData(db))).toBe(sorted(incoming.data));
    expect(await db.kv.get('priceSession')).toBeUndefined();
    expect(await getDataVersion(db)).toBeGreaterThan(before);
    const meta = await getMeta(db);
    expect(meta?.lastImportAt).toBeTruthy();
    expect(meta?.lastBackupAt).toBe('2026-09-24T08:00:00.000Z');
    expect(meta?.backupDataVersion).toBe(await getDataVersion(db));
    // The latest price per series, rebuilt: Pikachu-ex DE has three entries, the box one.
    expect(await db.priceLatest.count()).toBe(2);

    const [snapshot] = await listSnapshots(snaps);
    expect(snapshot).toMatchObject({
      id: outcome.snapshotId,
      reason: 'import',
      label: 'basic.settr.json',
      counts: { holdings: 2, tags: 1 },
    });
  });
});

describe('the v1 backup fixture', () => {
  it('still reads cleanly and imports as it is', async () => {
    const backup = await readFile(readFileSync(FIXTURE, 'utf8'));
    expect(backup.checksum).toBe('ok');
    expect(backup.issues).toEqual([]);
    expect(backup.header.schemaVersion).toBe(1);
    expect(backup.counts).toEqual({
      holdings: 4,
      prices: 4,
      wishlist: 1,
      tags: 2,
      locations: 2,
      customItems: 1,
      media: 1,
      tombstones: 1,
    });
    await importBackup(db, snaps, { mode: 'replace', data: backup.data, app: APP });
    const data = await readUserData(db);
    expect(data.settings.defaultCardLanguage).toBe('ja');
    expect(data.media[0]?.base64).toBe('AQID+g==');
    expect(data.holdings.find((h) => h.grading)?.valueOverride?.price.minor).toBe(12_000);
  });
});

describe('merge import', () => {
  it('previews and writes the plan: new, newer, deleted, remapped tags, overrides', async () => {
    const fav = tag('Favoriten');
    const kept = holding({ note: 'hier', updatedAt: '2026-09-20T10:00:00.000Z' });
    const gone = holding({ updatedAt: '2026-09-02T10:00:00.000Z' });
    await seed(db, {
      holdings: [kept, gone],
      tags: [fav],
      overrides: { cardmarket: { a: 1 } },
      settings: { ...DEFAULT_SETTINGS, defaultCardLanguage: 'en' },
    });

    const theirFav = tag('favoriten');
    const added = holding({ tags: [theirFav.id] });
    const incoming: BackupData = {
      holdings: [added, { ...kept, note: 'dort', updatedAt: '2026-09-21T10:00:00.000Z' }],
      prices: [price()],
      wishlist: [],
      tags: [theirFav],
      locations: [location('Binder')],
      customItems: [],
      media: [],
      settings: { ...DEFAULT_SETTINGS, defaultCardLanguage: 'ja' },
      overrides: { cardmarket: { a: 2, b: 3 } },
      tombstones: [tombstone(gone.id, 'holdings', '2026-09-10T10:00:00.000Z')],
    };

    const preview = await previewMerge(db, { data: incoming, installId: 'other' });
    expect(preview.holdings).toMatchObject({ added: 1, updated: 1, deleted: 1 });
    expect(preview.remapped.tags).toBe(1);

    const outcome = await importBackup(db, snaps, {
      mode: 'merge',
      data: incoming,
      installId: 'other',
      app: APP,
    });
    expect(outcome.plan?.holdings.added).toBe(1);

    const after = await readUserData(db);
    expect(after.holdings.map((h) => h.id).toSorted()).toEqual([added.id, kept.id].toSorted());
    expect(after.holdings.find((h) => h.id === kept.id)?.note).toBe('dort');
    expect(after.holdings.find((h) => h.id === added.id)?.tags).toEqual([fav.id]);
    expect(after.tags).toHaveLength(1);
    expect(after.locations).toHaveLength(1);
    expect(after.tombstones.map((t) => t.id)).toEqual([gone.id]);
    expect(after.overrides.cardmarket).toEqual({ a: 1, b: 3 });
    expect(after.settings.defaultCardLanguage).toBe('en');
    expect(await db.priceLatest.count()).toBe(1);
  });

  it('takes the backup’s settings when asked', async () => {
    const incoming = await readFile(readFileSync(FIXTURE, 'utf8'));
    await importBackup(db, snaps, {
      mode: 'merge',
      data: incoming.data,
      installId: incoming.header.installId,
      settingsFromBackup: true,
      app: APP,
    });
    expect((await readUserData(db)).settings.defaultCardLanguage).toBe('ja');
  });

  it('writes a tag rename and a new tag with the old name in any order', async () => {
    const old = tag('Alt', { updatedAt: '2026-09-01T10:00:00.000Z' });
    await seed(db, { tags: [old] });
    const renamed = { ...old, name: 'Neu', updatedAt: '2026-09-05T10:00:00.000Z' };
    const reused = tag('Alt', { updatedAt: '2026-09-06T10:00:00.000Z' });
    await importBackup(db, snaps, {
      mode: 'merge',
      data: {
        ...(await readUserData(db)),
        tags: [reused, renamed],
      },
      installId: 'other',
      app: APP,
    });
    expect((await db.tags.toArray()).map((t) => t.name).toSorted()).toEqual(['Alt', 'Neu']);
  });
});

describe('undo and snapshots', () => {
  it('restores the state before an import, and that restore can be undone too', async () => {
    const mine = holding({ note: 'meins' });
    await seed(db, { holdings: [mine] });
    const before = sorted(await readUserData(db));
    const incoming = await readFile(readFileSync(FIXTURE, 'utf8'));
    const { snapshotId } = await importBackup(db, snaps, {
      mode: 'replace',
      data: incoming.data,
      app: APP,
    });
    expect(sorted(await readUserData(db))).not.toBe(before);

    const restored = await restoreSnapshot(db, snaps, snapshotId, APP);
    expect(sorted(await readUserData(db))).toBe(before);
    const list = await listSnapshots(snaps);
    expect(list.map((s) => s.reason)).toEqual(['restore', 'import']);

    await restoreSnapshot(db, snaps, restored.snapshotId, APP);
    expect(sorted(await readUserData(db))).toBe(sorted(incoming.data));
  });

  it(`keeps the last ${KEEP_SNAPSHOTS} snapshots`, async () => {
    const incoming = await readFile(readFileSync(FIXTURE, 'utf8'));
    for (let i = 0; i < KEEP_SNAPSHOTS + 2; i++) {
      await importBackup(db, snaps, { mode: 'replace', data: incoming.data, app: APP });
    }
    expect(await listSnapshots(snaps)).toHaveLength(KEEP_SNAPSHOTS);
  });
});

describe('wipeAll', () => {
  it('deletes all data, device preferences and snapshots; the counter keeps growing', async () => {
    const incoming = await readFile(readFileSync(FIXTURE, 'utf8'));
    await importBackup(db, snaps, { mode: 'replace', data: incoming.data, app: APP });
    await db.kv.put({ key: 'ui:chart.range', value: '3M' });
    const version = await getDataVersion(db);

    await wipeAll(db, snaps);

    const data = await readUserData(db);
    expect(Object.values(data).filter(Array.isArray).flat()).toEqual([]);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(await db.priceLatest.count()).toBe(0);
    expect((await db.kv.toArray()).map((r) => r.key)).toEqual(['dataVersion']);
    expect(await getDataVersion(db)).toBe(version + 1);
    expect(await getMeta(db)).toBeUndefined();
    expect(await listSnapshots(snaps)).toEqual([]);
  });
});
