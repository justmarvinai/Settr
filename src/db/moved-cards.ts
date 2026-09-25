import type { Holding } from '@/domain/schemas';
import type { SettrDB } from './db';

/**
 * Cards can move to another set in a catalog update (the Scarlet & Violet basic Energy left
 * Karmesin & Purpur for a set of its own). Lots store the set they were added from, so lots of a
 * moved card follow it: the catalog's `movedCards` names each card's set now (ADR-061).
 */
const isStale = (moved: Readonly<Record<string, string>>) => (holding: Holding) =>
  holding.item.kind === 'card' && holding.setId !== moved[holding.item.id];

/** Lots of moved cards still recorded under another set. */
export async function countStaleMovedCards(
  db: SettrDB,
  moved: Readonly<Record<string, string>>,
): Promise<number> {
  const ids = Object.keys(moved);
  if (ids.length === 0) return 0;
  return db.holdings.where('item.id').anyOf(ids).filter(isStale(moved)).count();
}

/**
 * Points lots of moved cards at the card's set now; returns how many changed. The set is a
 * reference to the catalog, not an edit, so `updatedAt` stays and a merge sees the lot unchanged.
 */
export async function repairMovedCards(
  db: SettrDB,
  moved: Readonly<Record<string, string>>,
): Promise<number> {
  const ids = Object.keys(moved);
  if (ids.length === 0) return 0;
  return db.transaction('rw', db.holdings, async () => {
    const stale = await db.holdings.where('item.id').anyOf(ids).filter(isStale(moved)).toArray();
    for (const holding of stale)
      await db.holdings.update(holding.id, { setId: moved[holding.item.id] });
    return stale.length;
  });
}
