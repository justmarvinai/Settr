import { useLiveQuery } from 'dexie-react-hooks';
import {
  remaining,
  type CustomItem,
  type Holding,
  type Location,
  type PriceEntry,
  type PriceLatest,
  type Tag,
} from '@/domain/schemas';
import { db } from './instance';
import { getUiPref } from './repositories/collection-meta';
import { listHoldingsInSets, listHoldingsOfItem } from './repositories/holdings';
import { listPricesOfItem, listSeries } from './repositories/prices';

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

/** Items (cards, products) with copies left, for `owned:` in search; undefined while loading. */
export function useOwnedItemIds(): ReadonlySet<string> | undefined {
  return useLiveQuery(async () => {
    const ids = new Set<string>();
    await db.holdings.each((h) => {
      if (remaining(h) > 0) ids.add(h.item.id);
    });
    return ids;
  }, []);
}

/** Every entry of one price series, oldest first (PRC-02, PRC-03); undefined while loading. */
export function usePriceSeries(seriesKey: string): PriceEntry[] | undefined {
  return useLiveQuery(
    async () =>
      (await listSeries(db, seriesKey)).toSorted(
        (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
      ),
    [seriesKey],
  );
}

/** Every entry of one card or product across its series (language compare in the chart). */
export function useItemPrices(itemId: string): PriceEntry[] | undefined {
  return useLiveQuery(() => listPricesOfItem(db, itemId), [itemId]);
}

/** The latest price of every series, for valuation (DATA_MODEL.md §5.4); undefined while loading. */
export function useLatestPrices(): ReadonlyMap<string, PriceLatest> | undefined {
  return useLiveQuery(
    async () => new Map((await db.priceLatest.toArray()).map((p) => [p.seriesKey, p])),
    [],
  );
}

/** Every price entry, for the portfolio over time (DATA_MODEL.md §6.5). */
export function useAllPrices(): PriceEntry[] | undefined {
  return useLiveQuery(() => db.prices.toArray(), []);
}
