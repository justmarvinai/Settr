import { unitCosts } from '../collection/lots';
import { dayNumber, isoFromDayNumber } from '../dates';
import { BASE_CURRENCY } from '../money';
import type { Holding } from '../schemas/holding';
import type { PriceEntry } from '../schemas/price';
import { seriesKeyOf } from '../series';

/**
 * Portfolio value over time (DATA_MODEL.md §6.5): value, cost and invested capital on a date grid,
 * carrying each series' last price forward. With sparse manual prices the curve is honest step
 * data. O(series × grid + lots × grid); fast enough on the main thread for thousands of lots.
 */

export interface PortfolioPoint {
  date: string;
  /** Value of every priced lot held that day (minor units). */
  value: number;
  /** Value and cost of the lots with both, so pl = pricedValue − pricedCost. */
  pricedValue: number;
  pricedCost: number;
  /** Cost of every lot held that day whose price paid is known. */
  invested: number;
}

export interface SeriesOptions {
  /** Last day of the grid, `YYYY-MM-DD`. */
  today: string;
  /** First day; defaults to the earliest purchase. */
  from?: string | undefined;
  unpriced: 'exclude' | 'cost';
  /** Weekly steps beyond this many days (default two years). */
  dailyUpTo?: number;
}

type Observation = Pick<PriceEntry, 'date' | 'createdAt' | 'price'>;

/** A lot's first day: its purchase date, else the day it was entered. */
export function acquiredOn(h: Pick<Holding, 'acquisition' | 'createdAt'>): string {
  return h.acquisition.date ?? h.createdAt.slice(0, 10);
}

/** Grid days (day numbers): daily, weekly for long spans, always ending on `today`. */
export function gridDays(from: string, today: string, dailyUpTo = 730): number[] {
  const first = dayNumber(from);
  const last = dayNumber(today);
  if (first > last) return [last];
  const step = last - first > dailyUpTo ? 7 : 1;
  const days: number[] = [];
  // Count back from today so the last point is always today.
  for (let day = last; day >= first; day -= step) days.push(day);
  return days.toReversed();
}

/** Each series' price on each grid day (carry-forward; the later entry wins on a date), in minor units. */
function pricesOnGrid(
  entries: readonly Observation[],
  days: readonly number[],
): (number | undefined)[] {
  const sorted = entries
    .filter((e) => e.price.currency === BASE_CURRENCY)
    .toSorted((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const out: (number | undefined)[] = [];
  let next = 0;
  let current: number | undefined;
  for (const day of days) {
    while (next < sorted.length) {
      const entry = sorted[next];
      if (!entry || dayNumber(entry.date) > day) break;
      current = entry.price.minor;
      next += 1;
    }
    out.push(current);
  }
  return out;
}

export function portfolioSeries(
  holdings: readonly Holding[],
  pricesBySeries: ReadonlyMap<string, readonly Observation[]>,
  options: SeriesOptions,
): PortfolioPoint[] {
  const start =
    options.from ?? holdings.map(acquiredOn).reduce((min, d) => (d < min ? d : min), options.today);
  const days = gridDays(start, options.today, options.dailyUpTo);
  const value = Array.from({ length: days.length }, () => 0);
  const pricedValue = Array.from({ length: days.length }, () => 0);
  const pricedCost = Array.from({ length: days.length }, () => 0);
  const invested = Array.from({ length: days.length }, () => 0);
  const seriesCache = new Map<string, (number | undefined)[]>();

  for (const h of holdings) {
    const key = seriesKeyOf(h);
    let prices = seriesCache.get(key);
    if (!prices) {
      prices = pricesOnGrid(pricesBySeries.get(key) ?? [], days);
      seriesCache.set(key, prices);
    }
    const costs = unitCosts(h);
    const knownCost = costs && costs[0]?.currency !== BASE_CURRENCY ? undefined : costs;
    const acquired = dayNumber(acquiredOn(h));
    const disposals = h.disposals
      .map((d) => ({ day: dayNumber(d.date), quantity: d.quantity }))
      .toSorted((a, b) => a.day - b.day);
    const override = h.valueOverride;
    const overrideDay =
      override && override.price.currency === BASE_CURRENCY ? dayNumber(override.date) : undefined;

    let disposed = 0;
    let nextDisposal = 0;
    for (let i = 0; i < days.length; i += 1) {
      const day = days[i] ?? 0;
      if (day < acquired) continue;
      while (nextDisposal < disposals.length) {
        const d = disposals[nextDisposal];
        if (!d || d.day > day) break;
        disposed += d.quantity;
        nextDisposal += 1;
      }
      const left = h.quantity - disposed;
      if (left <= 0) continue;
      // Disposals take units in order, so the ones still held are the last `left` units.
      const cost = knownCost
        ? knownCost.slice(h.quantity - left).reduce((n, c) => n + c.minor, 0)
        : undefined;
      if (cost !== undefined) invested[i] = (invested[i] ?? 0) + cost;
      const unit =
        override && overrideDay !== undefined && overrideDay <= day
          ? override.price.minor
          : prices[i];
      if (unit !== undefined) {
        const lotValue = unit * left;
        value[i] = (value[i] ?? 0) + lotValue;
        if (cost !== undefined) {
          pricedValue[i] = (pricedValue[i] ?? 0) + lotValue;
          pricedCost[i] = (pricedCost[i] ?? 0) + cost;
        }
      } else if (options.unpriced === 'cost' && cost !== undefined) {
        value[i] = (value[i] ?? 0) + cost;
        pricedValue[i] = (pricedValue[i] ?? 0) + cost;
        pricedCost[i] = (pricedCost[i] ?? 0) + cost;
      }
    }
  }

  return days.map((day, i) => ({
    date: isoFromDayNumber(day),
    value: value[i] ?? 0,
    pricedValue: pricedValue[i] ?? 0,
    pricedCost: pricedCost[i] ?? 0,
    invested: invested[i] ?? 0,
  }));
}
