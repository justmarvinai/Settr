import { newId, nowIso } from '@/domain/ids';
import { holdingSchema, isOpen, type Holding } from '@/domain/schemas';
import type { SettrDB } from '../db';
import { bumpDataVersion } from './meta';
import { writeTombstone } from './tombstones';

export type NewHolding = Omit<
  Holding,
  'id' | 'createdAt' | 'updatedAt' | 'disposals' | 'tags' | 'mediaIds'
> &
  Partial<Pick<Holding, 'disposals' | 'tags' | 'mediaIds'>>;

export async function createHolding(db: SettrDB, input: NewHolding): Promise<Holding> {
  const now = nowIso();
  const holding = holdingSchema.parse({
    disposals: [],
    tags: [],
    mediaIds: [],
    ...input,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  });
  await db.transaction('rw', db.holdings, db.kv, async () => {
    await db.holdings.add(holding);
    await bumpDataVersion(db);
  });
  return holding;
}

export async function updateHolding(
  db: SettrDB,
  id: string,
  patch: Partial<Omit<Holding, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Holding> {
  return db.transaction('rw', db.holdings, db.kv, async () => {
    const current = await db.holdings.get(id);
    if (!current) throw new Error(`Holding ${id} not found`);
    const next = holdingSchema.parse({
      ...current,
      ...patch,
      id,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    });
    await db.holdings.put(next);
    await bumpDataVersion(db);
    return next;
  });
}

/** Deletes the row and writes a tombstone in one transaction (DATA_MODEL.md §5.10). */
export async function deleteHolding(db: SettrDB, id: string): Promise<Holding | undefined> {
  return db.transaction('rw', db.holdings, db.tombstones, db.kv, async () => {
    const current = await db.holdings.get(id);
    if (!current) return undefined;
    await db.holdings.delete(id);
    await writeTombstone(db, 'holdings', id);
    await bumpDataVersion(db);
    return current;
  });
}

/** Undo for a delete: puts the lot back and removes its tombstone. */
export async function restoreHolding(db: SettrDB, holding: Holding): Promise<void> {
  await db.transaction('rw', db.holdings, db.tombstones, db.kv, async () => {
    await db.holdings.put(holdingSchema.parse({ ...holding, updatedAt: nowIso() }));
    await db.tombstones.delete(holding.id);
    await bumpDataVersion(db);
  });
}

export async function listOpenHoldings(db: SettrDB): Promise<Holding[]> {
  return (await db.holdings.toArray()).filter(isOpen);
}
