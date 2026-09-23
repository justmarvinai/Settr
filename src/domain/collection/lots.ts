import { allocateEvenly } from '../allocation';
import { money, type Money } from '../money';
import type { Disposal, Holding } from '../schemas/holding';

/**
 * Lot arithmetic (DATA_MODEL.md §5.2, §6.2). A holding is a lot of identical items; disposals
 * (sales, trades, gifts, openings, losses) consume its units in order. All math runs on integer
 * minor units; per-unit amounts come from a largest-remainder split, so they always add up.
 */

type LotLike = Pick<Holding, 'quantity' | 'disposals' | 'acquisition'>;

export function disposedQuantity(h: Pick<Holding, 'disposals'>): number {
  return h.disposals.reduce((n, d) => n + d.quantity, 0);
}

/**
 * What the lot cost: price + fees. Unknown price ⇒ unknown cost, except pulls and gifts, which cost
 * nothing unless a price was recorded (e.g. the share of an opened product, Q5.8).
 */
export function costTotal(h: LotLike): Money | undefined {
  const { priceTotal, feesTotal, type } = h.acquisition;
  if (!priceTotal) {
    if (type !== 'pull' && type !== 'gift') return undefined;
    return money(feesTotal?.minor ?? 0, feesTotal?.currency);
  }
  if (feesTotal && feesTotal.currency !== priceTotal.currency) {
    throw new TypeError(`Currency mismatch: ${priceTotal.currency} vs ${feesTotal.currency}`);
  }
  return money(priceTotal.minor + (feesTotal?.minor ?? 0), priceTotal.currency);
}

/** Cost of each unit, in order (largest remainder: earlier units take the odd cents). */
export function unitCosts(h: LotLike): Money[] | undefined {
  const total = costTotal(h);
  if (!total) return undefined;
  return allocateEvenly(total.minor, h.quantity).map((minor) => money(minor, total.currency));
}

/** Cost per unit for display (rounded); the math always uses totals and unitCosts(). */
export function unitCostDisplay(h: LotLike): Money | undefined {
  const total = costTotal(h);
  if (!total || h.quantity <= 0) return undefined;
  return money(Math.round(total.minor / h.quantity), total.currency);
}

/** Units each disposal consumed, as [start, end) indexes into unitCosts(). */
function disposalRanges(h: Pick<Holding, 'disposals'>): Map<string, [number, number]> {
  const ranges = new Map<string, [number, number]>();
  let next = 0;
  for (const d of h.disposals) {
    ranges.set(d.id, [next, next + d.quantity]);
    next += d.quantity;
  }
  return ranges;
}

/** Cost of the units a disposal took (DATA_MODEL.md §6.2 `costOfUnits`). */
export function disposalCost(h: LotLike, disposalId: string): Money | undefined {
  const costs = unitCosts(h);
  const range = disposalRanges(h).get(disposalId);
  if (!costs || !range) return undefined;
  const [start, end] = range;
  const currency = costs[0]?.currency;
  return money(
    costs.slice(start, end).reduce((n, c) => n + c.minor, 0),
    currency,
  );
}

/** Cost of the units still held (DATA_MODEL.md §6.2 `remainingCost`). */
export function remainingCost(h: LotLike): Money | undefined {
  const costs = unitCosts(h);
  if (!costs) return undefined;
  const currency = costs[0]?.currency;
  return money(
    costs.slice(disposedQuantity(h)).reduce((n, c) => n + c.minor, 0),
    currency,
  );
}

/** Proceeds minus fees of a disposal; undefined when no proceeds were recorded. */
export function netProceeds(d: Pick<Disposal, 'proceedsTotal' | 'feesTotal'>): Money | undefined {
  if (!d.proceedsTotal) return undefined;
  const fees = d.feesTotal?.minor ?? 0;
  return money(d.proceedsTotal.minor - fees, d.proceedsTotal.currency);
}

/**
 * Realized result of a sale (DATA_MODEL.md §6.4): proceeds − fees − cost of the units sold.
 * Undefined when the proceeds or the lot's cost are unknown. Openings move their cost to the pulls
 * instead (§6.2), so they have no realized result of their own.
 */
export function realizedResult(h: LotLike, disposal: Disposal): Money | undefined {
  if (disposal.type === 'opened') return undefined;
  const net = netProceeds(disposal);
  const cost = disposalCost(h, disposal.id);
  if (!net || !cost) return undefined;
  if (net.currency !== cost.currency) {
    throw new TypeError(`Currency mismatch: ${net.currency} vs ${cost.currency}`);
  }
  return money(net.minor - cost.minor, net.currency);
}
