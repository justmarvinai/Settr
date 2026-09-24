import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, type Meta, type Settings } from '@/domain/schemas';
import { db } from './instance';
import { getDataVersion, getMeta } from './repositories/meta';
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

/** The change counter (bumped by every write); undefined while loading. */
export function useDataVersion(): number | undefined {
  return useLiveQuery(() => getDataVersion(db), []);
}

/** Lots on this device, open or closed: the first-run check (onboarding). */
export function countHoldings(): Promise<number> {
  return db.holdings.count();
}
