import { newId, nowIso } from '@/domain/ids';
import { priceEntrySchema, type PriceEntry, type PriceLatest } from '@/domain/schemas';
import type { SettrDB } from '../db';
import { bumpDataVersion } from './meta';
import { writeTombstone } from './tombstones';

export type NewPriceEntry = Omit<PriceEntry, 'id' | 'createdAt' | 'updatedAt'>;

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
