import { useLiveQuery } from 'dexie-react-hooks';
import {
  DEFAULT_SETTINGS,
  type CustomItem,
  type Holding,
  type Location,
  type Meta,
  type Settings,
  type Tag,
} from '@/domain/schemas';
import { db } from './instance';
import { getUiPref } from './repositories/collection-meta';
import { listHoldingsInSets, listHoldingsOfItem } from './repositories/holdings';
import { getMeta } from './repositories/meta';
import { getSettings } from './repositories/settings';

/** Reactive settings with defaults while loading (ARCHITECTURE.md §5). */
export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(db), [], DEFAULT_SETTINGS);
}

export function useMeta(): Meta | undefined {
  return useLiveQuery(() => getMeta(db), []);
}

/**
 * Display settings as stored, or undefined while loading, so defaults never flash over the theme
 * that index.html applied before first paint.
 */
export function useStoredDisplay(): Settings['display'] | undefined {
  return useLiveQuery(async () => (await getSettings(db)).display, []);
}

/** Number of lots, open or closed; undefined while loading. */
export function useHoldingCount(): number | undefined {
  return useLiveQuery(() => db.holdings.count(), []);
}

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

/** A per-device UI preference (kv `ui:*`); undefined while loading or unset. */
export function useUiPref(key: string): unknown {
  return useLiveQuery(() => getUiPref(db, key), [key]);
}

const collator = new Intl.Collator('de');
function byName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}
