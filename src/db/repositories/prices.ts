import { newId, nowIso } from '@/domain/ids';
import { priceEntrySchema, type PriceEntry, type PriceLatest } from '@/domain/schemas';
import { priceSessionSchema, type PriceSessionState } from '@/domain/valuation';
import type { SettrDB } from '../db';
import { bumpDataVersion } from './meta';
import { writeTombstone } from './tombstones';

export type NewPriceEntry = Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>;

/** What an edit may change (PRC-02); set a field to undefined to remove it. */
export type PricePatch = Partial<
  Pick<PriceEntry, 'date' | 'price' | 'priceType' | 'source' | 'context' | 'note' | 'origin'>
>;

/** Drops undefined fields, so optional ones are absent rather than stored as undefined. */
function withoutUndefined(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

/** Newer observation date wins; on the same date the later entry wins (DATA_MODEL.md §5.3). */
function isNewer(
  a: Pick<PriceEntry, 'date' | 'createdAt'>,
  b: Pick<PriceLatest, 'date' | 'createdAt'>,
): boolean {
  return a.date > b.date || (a.date === b.date && a.createdAt >= b.createdAt);
}

function toLatest(entry: PriceEntry): PriceLatest {
  return {
    seriesKey: entry.seriesKey,
    entryId: entry.id,
    date: entry.date,
    createdAt: entry.createdAt,
    price: entry.price,
  };
}

async function recomputeLatest(db: SettrDB, seriesKey: string): Promise<void> {
  const entries = await db.prices.where('seriesKey').equals(seriesKey).toArray();
  let latest: PriceEntry | undefined;
  for (const e of entries) if (!latest || isNewer(e, latest)) latest = e;
  if (latest) await db.priceLatest.put(toLatest(latest));
  else await db.priceLatest.delete(seriesKey);
}

/** Writes a price entry and keeps `priceLatest` current in the same transaction (ARCHITECTURE.md §6). */
export async function addPrice(db: SettrDB, input: NewPriceEntry): Promise<PriceEntry> {
  const now = nowIso();
  const entry = priceEntrySchema.parse({ ...input, id: newId(), createdAt: now, updatedAt: now });
  await db.transaction('rw', db.prices, db.priceLatest, db.kv, async () => {
    await db.prices.add(entry);
    const current = await db.priceLatest.get(entry.seriesKey);
    if (!current || isNewer(entry, current)) await db.priceLatest.put(toLatest(entry));
    await bumpDataVersion(db);
  });
  return entry;
}

export async function deletePrice(db: SettrDB, id: string): Promise<PriceEntry | undefined> {
  return db.transaction('rw', db.prices, db.priceLatest, db.tombstones, db.kv, async () => {
    const entry = await db.prices.get(id);
    if (!entry) return undefined;
    await db.prices.delete(id);
    await writeTombstone(db, 'prices', id);
    await recomputeLatest(db, entry.seriesKey);
    await bumpDataVersion(db);
    return entry;
  });
}

/**
 * Changes an entry (amount, date, type, note) and keeps `priceLatest` right. The entry keeps its
 * `createdAt`, so it doesn't jump ahead of later entries of the same day. Returns both states.
 */
export async function updatePrice(
  db: SettrDB,
  id: string,
  patch: PricePatch,
): Promise<{ before: PriceEntry; after: PriceEntry }> {
  return db.transaction('rw', db.prices, db.priceLatest, db.kv, async () => {
    const before = await db.prices.get(id);
    if (!before) throw new Error(`Price ${id} not found`);
    const after = priceEntrySchema.parse(
      withoutUndefined({ ...before, ...patch, id: before.id, updatedAt: nowIso() }),
    );
    await db.prices.put(after);
    await recomputeLatest(db, after.seriesKey);
    await bumpDataVersion(db);
    return { before, after };
  });
}

/** Undo for deletes and edits: puts entries back as they were and drops their tombstones. */
export async function restorePrices(db: SettrDB, entries: readonly PriceEntry[]): Promise<void> {
  if (!entries.length) return;
  const now = nowIso();
  await db.transaction('rw', db.prices, db.priceLatest, db.tombstones, db.kv, async () => {
    await db.prices.bulkPut(entries.map((e) => priceEntrySchema.parse({ ...e, updatedAt: now })));
    await db.tombstones.bulkDelete(entries.map((e) => e.id));
    for (const key of new Set(entries.map((e) => e.seriesKey))) await recomputeLatest(db, key);
    await bumpDataVersion(db);
  });
}

export async function getPrice(db: SettrDB, id: string): Promise<PriceEntry | undefined> {
  return db.prices.get(id);
}

/** Every entry of one card or product, all languages, variants and grades (charts compare them). */
export async function listPricesOfItem(db: SettrDB, itemId: string): Promise<PriceEntry[]> {
  return db.prices.where('item.id').equals(itemId).toArray();
}

/** Rebuilds the derived cache from scratch, e.g. after an import (DATA_MODEL.md §5.4). */
export async function rebuildPriceLatest(db: SettrDB): Promise<void> {
  await db.transaction('rw', db.prices, db.priceLatest, async () => {
    await db.priceLatest.clear();
    const latest = new Map<string, PriceEntry>();
    await db.prices.each((e) => {
      const cur = latest.get(e.seriesKey);
      if (!cur || isNewer(e, cur)) latest.set(e.seriesKey, e);
    });
    await db.priceLatest.bulkPut([...latest.values()].map(toLatest));
  });
}

export async function listSeries(db: SettrDB, seriesKey: string): Promise<PriceEntry[]> {
  return db.prices.where('[seriesKey+date]').between([seriesKey, ''], [seriesKey, '￿']).toArray();
}

const SESSION_KEY = 'priceSession';

/** The paused or running price session (kv `priceSession`); undefined when none or unreadable. */
export async function getPriceSession(db: SettrDB): Promise<PriceSessionState | undefined> {
  const parsed = priceSessionSchema.safeParse((await db.kv.get(SESSION_KEY))?.value);
  return parsed.success ? parsed.data : undefined;
}

/** Session state is per device and never exported (DATA_MODEL.md §5.9). */
export async function savePriceSession(db: SettrDB, state: PriceSessionState): Promise<void> {
  await db.kv.put({ key: SESSION_KEY, value: priceSessionSchema.parse(state) });
}

export async function clearPriceSession(db: SettrDB): Promise<void> {
  await db.kv.delete(SESSION_KEY);
}
