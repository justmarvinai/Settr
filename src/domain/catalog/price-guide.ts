import { z } from '@/lib/zod';
import { dayNumber } from '../dates';

/**
 * Cardmarket's price guide, filtered to catalog products (PRC-09, DATA_MODEL.md §4.1, ADR-020).
 * Built daily at deploy time and never committed while the repository is public (ADR-029). Values
 * are euros with decimals, as Cardmarket publishes them.
 */
const eurosSchema = z.number().nonnegative().optional();

export const guideValuesSchema = z.object({
  low: eurosSchema,
  trend: eurosSchema,
  avg1: eurosSchema,
  avg7: eurosSchema,
  avg30: eurosSchema,
  /** Cardmarket's `-holo` fields: reverse holo for Pokémon. */
  lowHolo: eurosSchema,
  trendHolo: eurosSchema,
});

export const priceGuideSnapshotSchema = z.object({
  source: z.literal('cardmarket-price-guide'),
  /** Cardmarket's own timestamp; missing when the build had no guide (the app then shows none). */
  guideCreatedAt: z.string().optional(),
  fetchedAt: z.string(),
  prices: z.record(z.string(), guideValuesSchema),
});

export type GuideValues = z.infer<typeof guideValuesSchema>;
export type PriceGuideSnapshot = z.infer<typeof priceGuideSnapshotSchema>;

/** Older snapshots are hidden (US-09): a stale suggestion would look like today's market. */
export const MAX_GUIDE_AGE_DAYS = 3;

/** A suggestion in minor units, with the day the guide was made. */
export interface GuideSuggestion {
  date: string;
  low?: number | undefined;
  trend?: number | undefined;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const toMinor = (euros: number | undefined) =>
  euros === undefined || euros <= 0 ? undefined : Math.round(euros * 100);

/**
 * Cardmarket's `-holo` fields are its reverse-holo prices for Pokémon (DATA_SOURCES.md §8.3); a
 * variant counts as reverse when its id says so. 30 Jahre has none.
 */
export const isReverseVariant = (variant: string | undefined) =>
  variant?.startsWith('reverse') ?? false;

/**
 * The guide's *ab* and *Trend* for a product, or nothing when the snapshot is missing, older than
 * three days or doesn't list the product. `reverse` reads the `-holo` fields.
 */
export function guideSuggestion(
  snapshot: PriceGuideSnapshot | null | undefined,
  productId: number | undefined,
  options: { today: string; reverse?: boolean },
): GuideSuggestion | undefined {
  const created = snapshot?.guideCreatedAt?.slice(0, 10);
  if (!snapshot || !created || !ISO_DAY.test(created) || productId === undefined) return undefined;
  if (dayNumber(options.today) - dayNumber(created) > MAX_GUIDE_AGE_DAYS) return undefined;
  const values = snapshot.prices[String(productId)];
  if (!values) return undefined;
  const low = toMinor(options.reverse ? values.lowHolo : values.low);
  const trend = toMinor(options.reverse ? values.trendHolo : values.trend);
  if (low === undefined && trend === undefined) return undefined;
  return { date: created, low, trend };
}
