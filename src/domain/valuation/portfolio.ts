import { disposalCost, netProceeds, realizedResult } from '../collection/lots';
import type { Money } from '../money';
import type { Disposal, Holding } from '../schemas/holding';
import { portfolioTotals, type LotValue, type PortfolioTotals } from './value';

/**
 * The Portfolio page's numbers (PRT-02…04, UX_SPEC.md §4.11): totals per group for allocation and
 * performance, and the sales and trades behind realized P/L. Pure, like the rest of valuation.
 */

export interface GroupTotals {
  key: string;
  totals: PortfolioTotals;
}

/**
 * Open lots grouped by `keyOf` (a set, a language, a rarity, a category), each group with the same
 * totals as the whole portfolio (DATA_MODEL.md §6.4), most valuable first. Lots without a key are
 * left out.
 */
export function groupTotals(
  values: readonly LotValue[],
  keyOf: (value: LotValue) => string | undefined,
): GroupTotals[] {
  const groups = new Map<string, LotValue[]>();
  for (const v of values) {
    if (v.remaining <= 0) continue;
    const key = keyOf(v);
    if (key === undefined) continue;
    const list = groups.get(key);
    if (list) list.push(v);
    else groups.set(key, [v]);
  }
  return [...groups]
    .map(([key, list]) => ({ key, totals: portfolioTotals(list) }))
    .toSorted(
      (a, b) =>
        b.totals.value.minor - a.totals.value.minor ||
        b.totals.invested.minor - a.totals.invested.minor ||
        a.key.localeCompare(b.key),
    );
}

/** A sale or trade (COL-11) with what it brought in and what the copies had cost (PRT-04). */
export interface RealizedEvent {
  holding: Holding;
  disposal: Disposal;
  /** Proceeds after fees; undefined when none were recorded. */
  net?: Money | undefined;
  /** What the disposed copies cost; undefined when the price paid is unknown. */
  cost?: Money | undefined;
  /** net − cost, when both are known (DATA_MODEL.md §6.4). */
  result?: Money | undefined;
}

/** Sales and trades, newest first. Gifts, losses and openings realize nothing and aren't listed. */
export function realizedEvents(holdings: readonly Holding[]): RealizedEvent[] {
  const events: RealizedEvent[] = [];
  for (const holding of holdings) {
    for (const disposal of holding.disposals) {
      if (disposal.type !== 'sale' && disposal.type !== 'trade') continue;
      events.push({
        holding,
        disposal,
        net: netProceeds(disposal),
        cost: disposalCost(holding, disposal.id),
        result: realizedResult(holding, disposal),
      });
    }
  }
  return events.toSorted(
    (a, b) =>
      b.disposal.date.localeCompare(a.disposal.date) || b.disposal.id.localeCompare(a.disposal.id),
  );
}
