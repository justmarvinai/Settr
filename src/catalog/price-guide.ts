import { queryOptions, useQuery } from '@tanstack/react-query';
import { priceGuideSnapshotSchema, type PriceGuideSnapshot } from '@/domain/catalog/price-guide';

/**
 * Yesterday's Cardmarket price guide for the catalog's products (PRC-09), built with each
 * deployment (ADR-029). Optional: when it's missing or broken there are simply no suggestions.
 * Imported directly, not through the `@/catalog` barrel, so the startup bundle doesn't carry it.
 */
export async function fetchPriceGuide(): Promise<PriceGuideSnapshot | null> {
  try {
    const response = await fetch('/catalog/v1/cm-prices.json');
    if (!response.ok) return null;
    const parsed = priceGuideSnapshotSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The snapshot changes with each daily deployment; an hour is fresh enough. */
export const priceGuideQuery = queryOptions({
  queryKey: ['catalog', 'price-guide'],
  queryFn: fetchPriceGuide,
  staleTime: 60 * 60 * 1000,
  retry: false,
});

/** The snapshot, `null` without one, `undefined` while it loads (never suspends: it's optional). */
export function usePriceGuide(enabled = true) {
  return useQuery({ ...priceGuideQuery, enabled }).data;
}
