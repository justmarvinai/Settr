import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canonicalJson } from '@/domain/backup';
import { remaining } from '@/domain/schemas';
import { cardSeriesKey } from '@/domain/series';
import { sha256Hex } from '@/lib/hash';
import { SettrDB } from './db';
import {
  addDisposal,
  addPrice,
  allocatePullCosts,
  backupFileName,
  createBackup,
  createCustomItem,
  createHoldings,
  createLocation,
  customItemRef,
  deleteCustomItem,
  deleteHoldings,
  deleteLocation,
  deleteTag,
  duplicateHolding,
  ensureTag,
  getMeta,
  countStaleMovedCards,
  listHoldingsInSets,
  listPulls,
  recordBackup,
  removeDisposal,
  renameTag,
  repairMovedCards,
  restoreHoldings,
  restoreTagOrLocation,
  updateHolding,
  updateHoldings,
  type NewHolding,
} from './index';

let db: SettrDB;
let n = 0;
beforeEach(async () => {
  db = new SettrDB(`settr-collection-${++n}`);
  await db.open();
});
afterEach(async () => {
  await db.delete();
});

const card = (id: string, patch: Partial<NewHolding> = {}): NewHolding => ({
  item: { kind: 'card', id },
  setId: 'intl:30th',
  print: 'intl',
  snapshot: { name: id },
  language: 'de',
  variant: 'std',
  condition: 'NM',
  quantity: 1,
  acquisition: { type: 'purchase' },
  ...patch,
});

const display: NewHolding = {
  item: { kind: 'sealed', id: 'asia:m6a-box' },
  setId: 'asia:M6a',
  print: 'asia',
  snapshot: { name: 'Booster-Box' },
  language: 'ja',
  sealedState: 'sealed',
  quantity: 2,
  acquisition: {
    type: 'purchase',
    date: '2026-09-16',
    priceTotal: { minor: 30000, currency: 'EUR' },
  },
};

describe('holdings: bulk, duplicate, undo', () => {
  it('creates many lots in one go and finds them by set', async () => {
    await createHoldings(db, [
      card('intl:30th:001'),
      card('intl:mee:009'),
      card('x', { setId: 'other' }),
    ]);
    expect((await listHoldingsInSets(db, ['intl:30th'])).length).toBe(2);
  });

  it('drops undefined fields instead of storing them', async () => {
    const [h] = await createHoldings(db, [card('intl:30th:001', { note: undefined })]);
    const stored = await db.holdings.get(h!.id);
    expect(stored && 'note' in stored).toBe(false);
    const { after } = await updateHolding(db, h!.id, { location: { id: 'l1', page: 2 } });
    expect(after.location).toEqual({ id: 'l1', page: 2 });
    const { after: moved } = await updateHolding(db, h!.id, { location: undefined });
    expect('location' in moved).toBe(false);
  });

  it('rejects purchase dates in the future', async () => {
    await expect(
      createHoldings(db, [card('a', { acquisition: { type: 'purchase', date: '2999-01-01' } })]),
    ).rejects.toThrow(RangeError);
  });

  it('duplicates a lot without its sales', async () => {
    const [h] = await createHoldings(db, [card('a', { quantity: 2, tags: ['t1'] })]);
    await addDisposal(db, h!.id, { type: 'sale', date: '2026-09-20', quantity: 1 });
    const copy = await duplicateHolding(db, h!.id);
    expect(copy.id).not.toBe(h!.id);
    expect(copy.disposals).toEqual([]);
    expect(copy.tags).toEqual(['t1']);
    expect(copy.quantity).toBe(2);
  });

  it('deletes several lots and restores them on undo', async () => {
    const lots = await createHoldings(db, [card('a'), card('b')]);
    const deleted = await deleteHoldings(
      db,
      lots.map((h) => h.id),
    );
    expect(deleted).toHaveLength(2);
    expect(await db.holdings.count()).toBe(0);
    expect(await db.tombstones.count()).toBe(2);
    await restoreHoldings(db, deleted);
    expect(await db.holdings.count()).toBe(2);
    expect(await db.tombstones.count()).toBe(0);
  });

  it('patches many lots and returns them as they were', async () => {
    const lots = await createHoldings(db, [card('a'), card('b', { tags: ['x'] })]);
    const before = await updateHoldings(
      db,
      lots.map((h) => h.id),
      (h) => ({
        tags: [...new Set([...h.tags, 'y'])],
      }),
    );
    expect(before.map((h) => h.tags)).toEqual([[], ['x']]);
    expect(
      (await db.holdings.toArray())
        .map((h) => h.tags.join(','))
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(['x,y', 'y']);
  });
});

describe('cards that moved to another set (ADR-061)', () => {
  it('points their lots at the set the card is in now, without touching anything else', async () => {
    const [energy, other] = await createHoldings(db, [
      card('intl:sve:001', { setId: 'intl:sv01' }),
      card('intl:sv01:001', { setId: 'intl:sv01' }),
    ]);
    const moved = { 'intl:sve:001': 'intl:sve' };
    expect(await countStaleMovedCards(db, moved)).toBe(1);

    expect(await repairMovedCards(db, moved)).toBe(1);
    const after = await db.holdings.get(energy!.id);
    expect(after?.setId).toBe('intl:sve');
    // A catalog reference, not an edit: a merge still sees the lot as it was.
    expect(after?.updatedAt).toBe(energy?.updatedAt);
    expect((await db.holdings.get(other!.id))?.setId).toBe('intl:sv01');
    expect((await listHoldingsInSets(db, ['intl:sve'])).map((h) => h.id)).toEqual([energy!.id]);

    expect(await countStaleMovedCards(db, moved)).toBe(0);
    expect(await repairMovedCards(db, moved)).toBe(0);
    expect(await repairMovedCards(db, {})).toBe(0);
  });
});

describe('disposals (COL-11)', () => {
  it('records and undoes a sale, and refuses selling more than is left', async () => {
    const [h] = await createHoldings(db, [card('a', { quantity: 3 })]);
    const { holding, disposal } = await addDisposal(db, h!.id, {
      type: 'sale',
      date: '2026-09-21',
      quantity: 2,
      proceedsTotal: { minor: 5000, currency: 'EUR' },
    });
    expect(remaining(holding)).toBe(1);
    await expect(
      addDisposal(db, h!.id, { type: 'gift', date: '2026-09-21', quantity: 2 }),
    ).rejects.toThrow(RangeError);
    const undone = await removeDisposal(db, h!.id, disposal.id);
    expect(remaining(undone)).toBe(3);
  });

  it('refuses a disposal dated before the purchase', async () => {
    const [h] = await createHoldings(db, [
      card('a', { acquisition: { type: 'purchase', date: '2026-09-20' } }),
    ]);
    await expect(
      addDisposal(db, h!.id, { type: 'sale', date: '2026-09-19', quantity: 1 }),
    ).rejects.toThrow(RangeError);
  });
});

describe('opening sealed products (COL-12)', () => {
  it('splits the cost of the opened units across the pulls', async () => {
    const [box] = await createHoldings(db, [display]);
    await addDisposal(db, box!.id, { type: 'opened', date: '2026-09-20', quantity: 1 });
    const pulls = await createHoldings(db, [
      card('asia:M6a:150', {
        language: 'ja',
        quantity: 1,
        acquisition: { type: 'pull', date: '2026-09-20', fromHoldingId: box!.id },
      }),
      card('asia:M6a:001', {
        language: 'ja',
        quantity: 3,
        acquisition: { type: 'pull', date: '2026-09-20', fromHoldingId: box!.id },
      }),
    ]);
    expect((await listPulls(db, box!.id)).length).toBe(2);

    // Nothing priced: evenly per card (1 + 3 copies share 150,00 €).
    await allocatePullCosts(db, box!.id);
    const even = await db.holdings.bulkGet(pulls.map((p) => p.id));
    expect(even.map((p) => p?.acquisition.priceTotal?.minor)).toEqual([3750, 11250]);

    // With a value for the hit: it carries the whole cost of the opened box.
    const before = await allocatePullCosts(db, box!.id, new Map([[pulls[0]!.id, 12000]]));
    expect(before).toHaveLength(2);
    const byValue = await db.holdings.bulkGet(pulls.map((p) => p.id));
    expect(byValue.map((p) => p?.acquisition.priceTotal?.minor)).toEqual([15000, 0]);
    expect(byValue.every((p) => p?.acquisition.fromHoldingId === box!.id)).toBe(true);
  });

  it('weighs pulls by their latest prices when no values are given', async () => {
    const [box] = await createHoldings(db, [display]);
    await addDisposal(db, box!.id, { type: 'opened', date: '2026-09-20', quantity: 1 });
    const pull = { type: 'pull' as const, date: '2026-09-20', fromHoldingId: box!.id };
    const [hit, bulk] = await createHoldings(db, [
      card('asia:M6a:150', { language: 'ja', acquisition: pull }),
      card('asia:M6a:001', { language: 'ja', quantity: 3, acquisition: pull }),
    ]);
    await addPrice(db, {
      seriesKey: cardSeriesKey('asia:M6a:150', 'ja', 'std', 'raw'),
      item: { kind: 'card', id: 'asia:M6a:150' },
      language: 'ja',
      variant: 'std',
      grade: 'raw',
      snapshot: { name: 'hit' },
      date: '2026-09-20',
      price: { minor: 9000, currency: 'EUR' },
      priceType: 'from',
      source: 'cardmarket',
      origin: 'manual',
    });
    await allocatePullCosts(db, box!.id);
    const after = await db.holdings.bulkGet([hit!.id, bulk!.id]);
    expect(after.map((p) => p?.acquisition.priceTotal?.minor)).toEqual([15000, 0]);
  });
});

describe('tags, locations and custom items', () => {
  it('reuses tags by name and keeps names unique', async () => {
    const a = await ensureTag(db, '  Tauschordner ');
    const again = await ensureTag(db, 'tauschordner');
    expect(again.id).toBe(a.id);
    expect(a.name).toBe('Tauschordner');
    const b = await ensureTag(db, 'Favoriten');
    await expect(renameTag(db, b.id, 'TAUSCHORDNER')).rejects.toThrow(RangeError);
  });

  it('removes a deleted tag from its lots and brings it back on undo', async () => {
    const tag = await ensureTag(db, 'Favoriten');
    const [h] = await createHoldings(db, [card('a', { tags: [tag.id] })]);
    const deleted = await deleteTag(db, tag.id);
    expect((await db.holdings.get(h!.id))?.tags).toEqual([]);
    await restoreTagOrLocation(db, deleted!);
    expect((await db.holdings.get(h!.id))?.tags).toEqual([tag.id]);
    expect(await db.tags.count()).toBe(1);
  });

  it('clears a deleted location from its lots', async () => {
    const binder = await createLocation(db, {
      name: 'VaultX 9er',
      kind: 'binder',
      layout: { columns: 3, rows: 3 },
      pages: 20,
    });
    expect(binder.sort).toBe(0);
    const [h] = await createHoldings(db, [
      card('a', { location: { id: binder.id, page: 4, slot: 7 } }),
    ]);
    const deleted = await deleteLocation(db, binder.id);
    expect((await db.holdings.get(h!.id))?.location).toBeUndefined();
    await restoreTagOrLocation(db, deleted!);
    expect((await db.holdings.get(h!.id))?.location).toEqual({ id: binder.id, page: 4, slot: 7 });
  });

  it('keeps custom items that lots still use', async () => {
    const item = await createCustomItem(db, {
      kind: 'card',
      name: { de: 'Pikachu Promo' },
      languages: ['de'],
    });
    const [h] = await createHoldings(db, [
      card(customItemRef(item.id), { setId: undefined, variant: undefined }),
    ]);
    await expect(deleteCustomItem(db, item.id)).rejects.toThrow(RangeError);
    await deleteHoldings(db, [h!.id]);
    expect((await deleteCustomItem(db, item.id))?.id).toBe(item.id);
  });
});

describe('backup export (IMPORT_EXPORT §2)', () => {
  it('writes the envelope with counts and a checksum over the data', async () => {
    await createHoldings(db, [card('a'), card('b')]);
    await ensureTag(db, 'Favoriten');
    await db.media.put({
      id: 'm1',
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
      blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/webp' }),
      mime: 'image/webp',
      width: 1,
      height: 1,
      bytes: 4,
    });
    const backup = await createBackup(db, { appVersion: '0.3.0', catalogVersion: '2026.09.23.5' });
    expect(backup).toMatchObject({
      format: 'settr-backup',
      formatVersion: 1,
      schemaVersion: 1,
      app: { name: 'Settr', version: '0.3.0', catalogVersion: '2026.09.23.5' },
      options: { includesMedia: true },
      counts: { holdings: 2, tags: 1, media: 1, prices: 0, tombstones: 0 },
    });
    expect(backup.data.media[0]?.base64).toBe('AQID+g==');
    expect(backup.data.settings).toMatchObject({ defaultCardLanguage: 'de' });
    expect(backup.checksum.value).toBe(await sha256Hex(canonicalJson(backup.data)));
    expect(backup.installId).toBe((await getMeta(db))?.installId);

    await recordBackup(db, backup);
    expect((await getMeta(db))?.lastBackupAt).toBe(backup.exportedAt);

    const lean = await createBackup(db, {
      appVersion: '0.3.0',
      catalogVersion: null,
      includesMedia: false,
    });
    expect(lean.counts.media).toBe(0);
  });

  it('writes canonical JSON and a dated file name', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}',
    );
    expect(backupFileName(new Date(2026, 8, 23, 10, 12))).toBe(
      'settr-backup-2026-09-23-1012.settr.json',
    );
  });
});
