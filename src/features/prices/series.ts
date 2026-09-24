import type { ChartPoint, MarkerShape, VizColor } from '@/components/domain/charts/TimeChart';
import { remainingCost } from '@/domain/collection';
import type { CardLanguage } from '@/domain/catalog-types';
import { dayNumber } from '@/domain/dates';
import { BASE_CURRENCY } from '@/domain/money';
import {
  PRICE_TYPES,
  remaining,
  type Holding,
  type PriceEntry,
  type PriceType,
  type Settings,
} from '@/domain/schemas';
import { seriesKeyOf, type GradeKey } from '@/domain/series';

/**
 * What the price views derive from price entries and lots: ordering, chart points, the purchase
 * baseline and what a new entry stores about how it was looked up (R2.2).
 */

type Ordered = Pick<PriceEntry, 'date' | 'createdAt'>;

/** Oldest first; on the same day the later entry comes last (it wins, DATA_MODEL.md §5.3). */
export const oldestFirst = (a: Ordered, b: Ordered) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
export const newestFirst = (a: Ordered, b: Ordered) => oldestFirst(b, a);

/** Every observation is marked, shaped by its price type (DESIGN_SYSTEM.md §9). */
export const MARKERS: Record<PriceType, MarkerShape> = {
  from: 'circle',
  trend: 'square',
  avg30: 'diamond',
  avg7: 'diamond',
  avg1: 'diamond',
  sold: 'triangle',
  manual: 'ring',
};

const LANGUAGE_LINES: Partial<Record<CardLanguage, { color: VizColor; dash: string }>> = {
  de: { color: 5, dash: '7 4' },
  en: { color: 2, dash: '2 4' },
  ja: { color: 7, dash: '10 4 2 4' },
  'zh-tw': { color: 4, dash: '4 3' },
  'zh-cn': { color: 1, dash: '1 4' },
};

/** Fixed color and dash per card language, so comparison lines read the same on every card. */
export function languageLine(language: CardLanguage): { color: VizColor; dash: string } {
  return LANGUAGE_LINES[language] ?? { color: 8, dash: '5 3 1 3' };
}

/** Entries in euros as chart points, oldest first. Other currencies are never mixed in. */
export function chartPoints(entries: readonly PriceEntry[]): ChartPoint[] {
  return entries
    .filter((e) => e.price.currency === BASE_CURRENCY)
    .toSorted(oldestFirst)
    .map((e) => ({
      day: dayNumber(e.date),
      value: e.price.minor,
      marker: MARKERS[e.priceType],
      id: e.id,
    }));
}

/** Only the last entry of a day counts (it's what valuation uses); the chart plots one per day. */
export function lastPerDay(points: readonly ChartPoint[]): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (const p of points) {
    if (out.at(-1)?.day === p.day) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

/**
 * The purchase price per copy of the open lots valued by `seriesKey`: the chart's dashed baseline.
 * Several lots give their average per copy (`avg`). Lots with an unknown price don't count.
 */
export function purchaseBaseline(
  holdings: readonly Holding[],
  seriesKey: string,
): { minor: number; avg: boolean } | undefined {
  let cost = 0;
  let copies = 0;
  let lots = 0;
  for (const h of holdings) {
    const left = remaining(h);
    if (left <= 0 || seriesKeyOf(h) !== seriesKey) continue;
    const total = remainingCost(h);
    if (!total || total.currency !== BASE_CURRENCY) continue;
    cost += total.minor;
    copies += left;
    lots += 1;
  }
  if (!copies) return undefined;
  return { minor: Math.round(cost / copies), avg: lots > 1 };
}

/** A price type from a form value (falls back to the default `ab (DE)`). */
export function priceTypeOf(value: string): PriceType {
  return PRICE_TYPES.find((t) => t === value) ?? 'from';
}

/** A grade key as stored on entries: `raw` or `company-grade`. */
export function isGradeKey(value: string): value is GradeKey {
  return value === 'raw' || /^[^-]+-.+$/.test(value);
}

/** Where a price comes from, by its type: Cardmarket's figures, or anything else. */
export function sourceOf(type: PriceType): PriceEntry['source'] {
  return type === 'sold' || type === 'manual' ? 'other' : 'cardmarket';
}

/**
 * How an *ab (DE)* price was looked up: German sellers, the copy's language, Near Mint or better
 * (R2.2, from Einstellungen › Preise). Other types are Cardmarket's own figures or estimates.
 */
export function contextOf(
  type: PriceType,
  settings: Settings,
  language: CardLanguage,
): PriceEntry['context'] {
  if (type !== 'from') return undefined;
  const { cardmarket } = settings.price;
  return {
    sellerCountry: cardmarket.sellerCountry,
    ...(cardmarket.matchLanguage ? { language } : {}),
    minCondition: cardmarket.minCondition,
  };
}
