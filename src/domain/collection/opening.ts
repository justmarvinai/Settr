import { allocate, money, type Money } from '../money';

/**
 * Cost of an opened product split across the pulls (COL-12, Q5.8, DATA_MODEL.md §6.2): in
 * proportion to each pull's value at opening; when none has a value, evenly per card. A pull
 * without a value gets no share while others have one (its value is unknown, so it can't be
 * weighed). Largest remainder keeps the sum exact.
 */

export interface PullShareInput {
  /** Copies in this pull lot. */
  quantity: number;
  /** Value of the whole pull lot at opening (unit value × quantity), if known. */
  value?: Money | undefined;
}

export function allocateOpeningCost(cost: Money, pulls: readonly PullShareInput[]): Money[] {
  if (pulls.length === 0) return [];
  for (const pull of pulls) {
    if (pull.value && pull.value.currency !== cost.currency) {
      throw new TypeError(`Currency mismatch: ${cost.currency} vs ${pull.value.currency}`);
    }
  }
  const valued = pulls.some((p) => (p.value?.minor ?? 0) > 0);
  const weights = pulls.map((p) =>
    valued ? Math.max(0, p.value?.minor ?? 0) : Math.max(0, p.quantity),
  );
  return allocate(cost.minor, weights).map((minor) => money(minor, cost.currency));
}
