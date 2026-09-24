import { remainingCost, realizedResult } from '../collection/lots';
import { daysBetween } from '../dates';
import { BASE_CURRENCY, money, type Money } from '../money';
import { remaining, type Holding } from '../schemas/holding';
import type { PriceLatest } from '../schemas/price';
import { seriesKeyOf } from '../series';

/**
 * Valuation and profit/loss today (DATA_MODEL.md §6.3, §6.4). Pure functions over lots and the
 * latest price of each series. Every price belongs to its card language (R2.6): a lot is only ever
 * valued by its own series or its own *Eigener Wert*.
 */

export interface ValuationOptions {
  /** `YYYY-MM-DD`, the valuation date. */
  today: string;
  /** A price older than this many days is stale (setting, default 14). */
  staleAfterDays: number;
  /** Lots without a price: left out (default) or valued at what they cost. */
  unpriced: 'exclude' | 'cost';
}

/** Where a lot's value per copy comes from. */
export interface UnitValue {
  price: Money;
  /** The price's observation date (or the Eigener Wert's date). */
  date: string;
  /** `override` = the lot's own value (*Eigener Wert*, PRC-07). */
  source: 'series' | 'override';
}

export interface LotValue {
  holding: Holding;
  seriesKey: string;
  /** Copies still held. */
  remaining: number;
  unit?: UnitValue | undefined;
  /** remaining × unit, or the remaining cost when an unpriced lot is valued at cost. */
  value?: Money | undefined;
  /** What the copies still held cost; undefined when the price paid is unknown. */
  cost?: Money | undefined;
  /** value − cost, when both are known. */
  pl?: Money | undefined;
  /** pl ÷ cost; undefined when the cost is 0 or unknown ("—", DATA_MODEL.md §6.4). */
  plRatio?: number | undefined;
  /** The unit value is older than the stale threshold. */
  stale: boolean;
  /** No price: the value stands in at cost (setting *Mit Kaufpreis*). */
  atCost: boolean;
}

/** The lot's Eigener Wert if set on or before `asOf`, else its series' latest price on or before. */
export function unitValueOf(
  h: Pick<Holding, 'valueOverride'>,
  latest: Pick<PriceLatest, 'date' | 'price'> | undefined,
  asOf: string,
): UnitValue | undefined {
  const override = h.valueOverride;
  if (override && override.date <= asOf && override.price.currency === BASE_CURRENCY) {
    return { price: money(override.price.minor), date: override.date, source: 'override' };
  }
  if (latest && latest.date <= asOf && latest.price.currency === BASE_CURRENCY) {
    return { price: money(latest.price.minor), date: latest.date, source: 'series' };
  }
  return undefined;
}

export function isStale(date: string, today: string, staleAfterDays: number): boolean {
  return daysBetween(date, today) > staleAfterDays;
}

/** Value, cost and P/L of one lot (DATA_MODEL.md §6.3). */
export function valueLot(
  h: Holding,
  latest: Pick<PriceLatest, 'date' | 'price'> | undefined,
  options: ValuationOptions,
): LotValue {
  const seriesKey = seriesKeyOf(h);
  const left = remaining(h);
  const rawCost = remainingCost(h);
  const cost = rawCost && rawCost.currency === BASE_CURRENCY ? rawCost : undefined;
  const unit = unitValueOf(h, latest, options.today);
  if (unit) {
    const value = money(unit.price.minor * left);
    const pl = cost ? money(value.minor - cost.minor) : undefined;
    return {
      holding: h,
      seriesKey,
      remaining: left,
      unit,
      value,
      cost,
      pl,
      plRatio: pl && cost && cost.minor > 0 ? pl.minor / cost.minor : undefined,
      stale: left > 0 && isStale(unit.date, options.today, options.staleAfterDays),
      atCost: false,
    };
  }
  if (options.unpriced === 'cost' && cost && left > 0) {
    return {
      holding: h,
      seriesKey,
      remaining: left,
      value: cost,
      cost,
      pl: money(0),
      plRatio: cost.minor > 0 ? 0 : undefined,
      stale: false,
      atCost: true,
    };
  }
  return { holding: h, seriesKey, remaining: left, cost, stale: false, atCost: false };
}

/** Values every lot with its series' latest price. */
export function valueLots(
  holdings: readonly Holding[],
  latest: ReadonlyMap<string, Pick<PriceLatest, 'date' | 'price'>>,
  options: ValuationOptions,
): LotValue[] {
  return holdings.map((h) => valueLot(h, latest.get(seriesKeyOf(h)), options));
}

export interface PortfolioTotals {
  /** Gesamtwert: every priced open lot (and unpriced ones at cost when the setting says so). */
  value: Money;
  /** Investiert: the remaining cost of every open lot with a known price paid, priced or not (§6.4). */
  invested: Money;
  /** The P/L basis: cost of the lots that have both a value and a known cost. */
  pricedCost: Money;
  /** Unrealized P/L over the lots with both value and cost. */
  pl: Money;
  plRatio?: number | undefined;
  /** Realized P/L of sales and trades (Q6.5). */
  realized: Money;
  lots: number;
  copies: number;
  /** Open lots without a price of their own (series or Eigener Wert). */
  unpriced: number;
  /** Open lots whose price is older than the threshold. */
  stale: number;
  /** Open lots whose purchase price is unknown. */
  unknownCost: number;
}

/** Realized result of every sale and trade with recorded proceeds (DATA_MODEL.md §6.4). */
export function realizedTotal(holdings: readonly Holding[]): Money {
  let minor = 0;
  for (const h of holdings) {
    for (const d of h.disposals) {
      const result = realizedResult(h, d);
      if (result && result.currency === BASE_CURRENCY) minor += result.minor;
    }
  }
  return money(minor);
}

/** Sums lot values into the numbers the dashboard and the summaries show. */
export function portfolioTotals(
  values: readonly LotValue[],
  realized: Money = money(0),
): PortfolioTotals {
  let value = 0;
  let invested = 0;
  let pricedValue = 0;
  let pricedCost = 0;
  let lots = 0;
  let copies = 0;
  let unpriced = 0;
  let stale = 0;
  let unknownCost = 0;
  for (const v of values) {
    if (v.remaining <= 0) continue;
    lots += 1;
    copies += v.remaining;
    if (v.cost) invested += v.cost.minor;
    else unknownCost += 1;
    if (!v.unit) unpriced += 1;
    if (v.stale) stale += 1;
    if (v.value) {
      value += v.value.minor;
      if (v.cost) {
        pricedValue += v.value.minor;
        pricedCost += v.cost.minor;
      }
    }
  }
  const pl = pricedValue - pricedCost;
  return {
    value: money(value),
    invested: money(invested),
    pricedCost: money(pricedCost),
    pl: money(pl),
    plRatio: pricedCost > 0 ? pl / pricedCost : undefined,
    realized,
    lots,
    copies,
    unpriced,
    stale,
    unknownCost,
  };
}

/**
 * Top gainers and losers since purchase (UX_SPEC.md §4.1): lots with a value and a cost above 0,
 * ranked by P/L in euros or in percent. Ties keep the larger lot first.
 */
export function rankMovers(
  values: readonly LotValue[],
  by: 'abs' | 'ratio',
  count: number,
): { gainers: LotValue[]; losers: LotValue[] } {
  const ranked = values.filter(
    (v) => v.remaining > 0 && v.pl && v.cost && v.cost.minor > 0 && v.plRatio !== undefined,
  );
  const key = (v: LotValue) => (by === 'abs' ? (v.pl?.minor ?? 0) : (v.plRatio ?? 0));
  const tie = (a: LotValue, b: LotValue) => (b.value?.minor ?? 0) - (a.value?.minor ?? 0);
  return {
    gainers: ranked
      .filter((v) => key(v) > 0)
      .toSorted((a, b) => key(b) - key(a) || tie(a, b))
      .slice(0, count),
    losers: ranked
      .filter((v) => key(v) < 0)
      .toSorted((a, b) => key(a) - key(b) || tie(a, b))
      .slice(0, count),
  };
}
