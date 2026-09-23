import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { cardSeriesKey } from '@/domain/series';
import { SettrDB } from './db';
import {
  addPrice,
  createHolding,
  deleteHolding,
  deletePrice,
  ensureMeta,
  getDataVersion,
  getMeta,
  getSettings,
  listOpenHoldings,
  markBackupDone,
  purgeTombstones,
  rebuildPriceLatest,
  restoreHolding,
  updateHolding,
  updateSettings,
  type NewHolding,
  type NewPriceEntry,
} from './index';

let db: SettrDB;
let n = 0;
beforeEach(async () => {
  db = new SettrDB(`settr-test-${++n}`);
  await db.open();
});
afterEach(async () => {
  await db.delete();
});

const pikachu: NewHolding = {
  item: { kind: 'card', id: 'intl:30th:150' },
  setId: 'intl:30th',
  print: 'intl',
  snapshot: { name: 'Pikachu-ex', setName: '30 Jahre', localId: '150' },
  language: 'de',
  variant: 'std',
  condition: 'NM',
  quantity: 2,
  acquisition: {
    type: 'purchase',
    date: '2026-09-22',
    priceTotal: { minor: 17800, currency: 'EUR' },
  },
};

const series = cardSeriesKey('intl:30th:150', 'de', 'std', 'raw');
const price = (date: string, minor: number): NewPriceEntry => ({
  seriesKey: series,
  item: { kind: 'card', id: 'intl:30th:150' },
  language: 'de',
  variant: 'std',
  grade: 'raw',
  snapshot: { name: 'Pikachu-ex' },
  date,
  price: { minor, currency: 'EUR' },
  priceType: 'from',
  source: 'cardmarket',
  context: { sellerCountry: 'DE', language: 'de', minCondition: 'NM' },
  origin: 'manual',
});

describe('settings and meta', () => {
  it('returns defaults and deep-merges updates', async () => {
    expect((await getSettings(db)).display.theme).toBe('system');
    const next = await updateSettings(db, { display: { theme: 'dark' } });
    expect(next.display).toEqual({
      theme: 'dark',
      reduceTransparency: false,
      motion: 'full',
      colorblindPL: false,
    });
    expect((await getSettings(db)).display.theme).toBe('dark');
  });

  it('rejects invalid settings', async () => {
    await expect(updateSettings(db, { price: { staleAfterDays: 0 } })).rejects.toThrow(ZodError);
  });

  it('creates meta once and records backups', async () => {
    const meta = await ensureMeta(db);
    expect(await ensureMeta(db)).toEqual(meta);
    expect(meta.schemaVersion).toBe(1);
    await markBackupDone(db, '2026-09-23T10:00:00.000Z');
    expect((await getMeta(db))?.lastBackupAt).toBe('2026-09-23T10:00:00.000Z');
  });
});

describe('holdings', () => {
  it('creates, updates and bumps the data version', async () => {
    const h = await createHolding(db, pikachu);
    expect(h.disposals).toEqual([]);
    expect(await getDataVersion(db)).toBe(1);
    const updated = await updateHolding(db, h.id, {
      condition: 'LP',
      valueOverride: { price: { minor: 6500, currency: 'EUR' }, date: '2026-09-23' },
    });
    expect(updated.condition).toBe('LP');
    expect(updated.createdAt).toBe(h.createdAt);
    expect(await getDataVersion(db)).toBe(2);
  });

  it('validates on write', async () => {
    await expect(createHolding(db, { ...pikachu, quantity: 0 })).rejects.toThrow(ZodError);
    await expect(createHolding(db, { ...pikachu, language: 'xx' as never })).rejects.toThrow(
      ZodError,
    );
  });

  it('deletes with a tombstone and restores on undo', async () => {
    const h = await createHolding(db, pikachu);
    const deleted = await deleteHolding(db, h.id);
    expect(deleted?.id).toBe(h.id);
    expect(await db.holdings.count()).toBe(0);
    expect(await db.tombstones.get(h.id)).toMatchObject({ table: 'holdings' });
    await restoreHolding(db, h);
    expect(await db.holdings.count()).toBe(1);
    expect(await db.tombstones.get(h.id)).toBeUndefined();
  });

  it('lists only open lots', async () => {
    const h = await createHolding(db, pikachu);
    await createHolding(db, { ...pikachu, quantity: 1 });
    await updateHolding(db, h.id, {
      disposals: [
        {
          id: '0192f1c3-7b2a-7c0e-9d3f-5a1e2b3c4d5e',
          type: 'sale',
          date: '2026-09-23',
          quantity: 2,
        },
      ],
    });
    expect((await listOpenHoldings(db)).map((x) => x.quantity)).toEqual([1]);
  });
});

describe('prices and priceLatest', () => {
  it('keeps the newest observation as latest', async () => {
    await addPrice(db, price('2026-09-20', 8800));
    const newest = await addPrice(db, price('2026-09-22', 9490));
    await addPrice(db, price('2026-09-21', 9100)); // older date must not win
    expect(await db.priceLatest.get(series)).toMatchObject({
      entryId: newest.id,
      price: { minor: 9490 },
    });
  });

  it('lets a later entry on the same date win', async () => {
    await addPrice(db, price('2026-09-22', 9490));
    const second = await addPrice(db, price('2026-09-22', 9390));
    expect((await db.priceLatest.get(series))?.entryId).toBe(second.id);
  });

  it('recomputes latest on delete', async () => {
    const older = await addPrice(db, price('2026-09-20', 8800));
    const newest = await addPrice(db, price('2026-09-22', 9490));
    await deletePrice(db, newest.id);
    expect((await db.priceLatest.get(series))?.entryId).toBe(older.id);
    await deletePrice(db, older.id);
    expect(await db.priceLatest.get(series)).toBeUndefined();
    expect(await db.tombstones.where('table').equals('prices').count()).toBe(2);
  });

  it('rebuilds the cache from scratch', async () => {
    await addPrice(db, price('2026-09-20', 8800));
    const newest = await addPrice(db, price('2026-09-22', 9490));
    await db.priceLatest.clear();
    await rebuildPriceLatest(db);
    expect((await db.priceLatest.get(series))?.entryId).toBe(newest.id);
  });
});

describe('tombstones', () => {
  it('purges entries older than a year', async () => {
    await db.tombstones.bulkPut([
      { id: 'a', table: 'holdings', deletedAt: '2025-01-01T00:00:00.000Z' },
      { id: 'b', table: 'holdings', deletedAt: '2026-09-01T00:00:00.000Z' },
    ]);
    expect(await purgeTombstones(db, new Date('2026-09-23T00:00:00.000Z'))).toBe(1);
    expect((await db.tombstones.toArray()).map((t) => t.id)).toEqual(['b']);
  });
});
