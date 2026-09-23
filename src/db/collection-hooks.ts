import { useLiveQuery } from 'dexie-react-hooks';
import type { CustomItem, Holding, Location, Tag } from '@/domain/schemas';
import { db } from './instance';
import { getUiPref } from './repositories/collection-meta';
import { listHoldingsInSets, listHoldingsOfItem } from './repositories/holdings';

/** Live queries of the collection (ARCHITECTURE.md §5), loaded with the pages that use them. */

/** Every lot, open or closed; undefined while loading. */
export function useHoldings(): Holding[] | undefined {
  return useLiveQuery(() => db.holdings.toArray(), []);
}

/** Lots of a set chunk (main set, subsets, energies); undefined while loading. */
export function useHoldingsInSets(setIds: readonly string[]): Holding[] | undefined {
  const key = setIds.join('|');
  return useLiveQuery(() => listHoldingsInSets(db, key.split('|')), [key]);
}

/** Lots of one card or product; undefined while loading. */
export function useHoldingsOfItem(itemId: string): Holding[] | undefined {
  return useLiveQuery(() => listHoldingsOfItem(db, itemId), [itemId]);
}

export function useHolding(id: string | undefined): Holding | undefined {
  return useLiveQuery(async () => (id ? db.holdings.get(id) : undefined), [id]);
}

export function useTags(): Tag[] | undefined {
  return useLiveQuery(async () => (await db.tags.toArray()).toSorted(byName), []);
}

/** Locations in their order (then by name). */
export function useLocations(): Location[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.locations.toArray()).toSorted(
        (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || byName(a, b),
      ),
    [],
  );
}

export function useCustomItems(): CustomItem[] | undefined {
  return useLiveQuery(() => db.customItems.toArray(), []);
}

/**
 * A per-device UI preference (kv `ui:*`), wrapped so "still loading" (undefined) differs from
 * "never set" (`{ value: undefined }`).
 */
export function useUiPref(key: string): { value: unknown } | undefined {
  return useLiveQuery(async () => ({ value: await getUiPref(db, key) }), [key]);
}

const collator = new Intl.Collator('de');
function byName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}

/** Open and closed lots stored in a location (binder occupancy); undefined while loading. */
export function useHoldingsInLocation(locationId: string): Holding[] | undefined {
  return useLiveQuery(
    async () => (locationId ? db.holdings.where('location.id').equals(locationId).toArray() : []),
    [locationId],
  );
}

export function useCustomItem(id: string | undefined): CustomItem | undefined {
  return useLiveQuery(async () => (id ? db.customItems.get(id) : undefined), [id]);
}
