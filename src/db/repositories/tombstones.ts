import { nowIso } from '@/domain/ids';
import type { SettrDB } from '../db';

const MAX_AGE_DAYS = 365;

/** Must be called inside a transaction that includes `tombstones`. */
export async function writeTombstone(db: SettrDB, table: string, id: string): Promise<void> {
  await db.tombstones.put({ id, table, deletedAt: nowIso() });
}

/** Removes tombstones older than 365 days (DATA_MODEL.md §5.10). Returns how many were purged. */
export async function purgeTombstones(
  db: SettrDB,
  now: Date = new Date(),
  maxAgeDays = MAX_AGE_DAYS,
): Promise<number> {
  const cutoff = new Date(now.getTime() - maxAgeDays * 86_400_000).toISOString();
  return db.tombstones.where('deletedAt').below(cutoff).delete();
}
