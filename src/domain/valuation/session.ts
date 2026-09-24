import { z } from '@/lib/zod';
import { unitCosts } from '../collection/lots';
import { BASE_CURRENCY } from '../money';
import { remaining, type Holding } from '../schemas/holding';
import type { PriceLatest } from '../schemas/price';
import { seriesKeyOf } from '../series';
import {
  SESSION_ORDERS,
  SESSION_SCOPES,
  type SessionOrder,
  type SessionScope,
} from './session-search';
import { isStale, unitValueOf } from './value';

/**
 * The price-update session (PRC-04, UX_SPEC.md §4.10): which price series need a price, in which
 * order, and what a session changed. A series is what gets a price (card, language, variant,
 * grade; DATA_MODEL.md §6.1), so a session walks series, not lots. Pure; the state is kept in kv
 * `priceSession` so a paused session can be resumed.
 */

/** A series' latest price; `entryId` finds the entry (its type) when the caller has it. */
export type SeriesLatest = Pick<PriceLatest, 'date' | 'price'> & { entryId?: string | undefined };

export interface SeriesState {
  seriesKey: string;
  /** Open lots valued by this series today: lots with an Eigener Wert in effect don't count. */
  lots: Holding[];
  copies: number;
  latest?: SeriesLatest | undefined;
  /** Latest price × copies in minor units; 0 without a price. */
  value: number;
  /** Average price paid per copy of the lots with a known price, in minor units. */
  unitCost?: number | undefined;
  stale: boolean;
}

/** Every series with open lots valued by it, with its latest price and staleness. */
export function seriesStates(
  holdings: readonly Holding[],
  latest: ReadonlyMap<string, SeriesLatest>,
  options: { today: string; staleAfterDays: number },
): SeriesState[] {
  const groups = new Map<string, Holding[]>();
  for (const h of holdings) {
    if (remaining(h) <= 0) continue;
    if (unitValueOf(h, undefined, options.today)?.source === 'override') continue;
    const key = seriesKeyOf(h);
    const list = groups.get(key);
    if (list) list.push(h);
    else groups.set(key, [h]);
  }
  return [...groups].map(([seriesKey, lots]) => {
    const last = latest.get(seriesKey);
    const price = last && last.price.currency === BASE_CURRENCY ? last : undefined;
    const copies = lots.reduce((n, h) => n + remaining(h), 0);
    let costTotal = 0;
    let costCopies = 0;
    for (const h of lots) {
      const costs = unitCosts(h);
      if (!costs || costs[0]?.currency !== BASE_CURRENCY) continue;
      // The copies still held are the last ones (disposals take units in order).
      for (const c of costs.slice(h.quantity - remaining(h))) {
        costTotal += c.minor;
        costCopies += 1;
      }
    }
    return {
      seriesKey,
      lots,
      copies,
      latest: price,
      value: price ? price.price.minor * copies : 0,
      unitCost: costCopies ? Math.round(costTotal / costCopies) : undefined,
      stale: price ? isStale(price.date, options.today, options.staleAfterDays) : false,
    };
  });
}

export {
  SESSION_ORDERS,
  SESSION_SCOPES,
  type SessionOrder,
  type SessionScope,
} from './session-search';

/** Whether a series belongs to a scope (selection: the series of the chosen lots). */
export function inScope(
  state: SeriesState,
  scope: SessionScope,
  selection?: ReadonlySet<string>,
): boolean {
  if (scope === 'stale') return state.stale;
  if (scope === 'unpriced') return !state.latest;
  if (scope === 'selection') return selection?.has(state.seriesKey) ?? false;
  return true;
}

/**
 * The session's queue of series keys. `value`: most valuable first (unpriced ones last, the most
 * copies first); `oldest`: the oldest price first (no price counts as oldest); `set`: catalog
 * order, via `setSort`.
 */
export function sessionQueue(
  states: readonly SeriesState[],
  scope: SessionScope,
  order: SessionOrder,
  extra: { selection?: ReadonlySet<string>; setSort?: (state: SeriesState) => number } = {},
): string[] {
  const chosen = states.filter((s) => inScope(s, scope, extra.selection));
  const byCopies = (a: SeriesState, b: SeriesState) =>
    b.copies - a.copies || a.seriesKey.localeCompare(b.seriesKey);
  const compare: Record<SessionOrder, (a: SeriesState, b: SeriesState) => number> = {
    value: (a, b) => b.value - a.value || byCopies(a, b),
    oldest: (a, b) =>
      (a.latest?.date ?? '').localeCompare(b.latest?.date ?? '') || b.value - a.value,
    set: (a, b) => {
      const sort = extra.setSort ?? (() => 0);
      return sort(a) - sort(b) || byCopies(a, b);
    },
  };
  return chosen.toSorted(compare[order]).map((s) => s.seriesKey);
}

export const SESSION_OUTCOMES = ['saved', 'unchanged', 'skipped'] as const;

const resultSchema = z.object({
  outcome: z.enum(SESSION_OUTCOMES),
  /** The series' price before and after, per copy (minor units). */
  before: z.number().int().optional(),
  after: z.number().int().optional(),
  copies: z.number().int().nonnegative(),
  entryId: z.string().optional(),
});

/** kv `priceSession` (DATA_MODEL.md §5.9): never exported, dropped when it doesn't parse. */
export const priceSessionSchema = z.object({
  scope: z.enum(SESSION_SCOPES),
  order: z.enum(SESSION_ORDERS),
  queue: z.array(z.string()),
  position: z.number().int().nonnegative(),
  results: z.record(z.string(), resultSchema),
  startedAt: z.string(),
});

export type SessionResult = z.infer<typeof resultSchema>;
export type PriceSessionState = z.infer<typeof priceSessionSchema>;

export interface SessionSummary {
  saved: number;
  unchanged: number;
  skipped: number;
  /** How much the collection's value moved through this session (minor units). */
  delta: number;
  /** Of that, value that counts for the first time (series that had no price). */
  newlyPriced: number;
  /** The biggest moves, largest first. */
  movers: { seriesKey: string; delta: number; before?: number | undefined; after: number }[];
}

export function sessionSummary(state: PriceSessionState, moversCount = 3): SessionSummary {
  let saved = 0;
  let unchanged = 0;
  let skipped = 0;
  let delta = 0;
  let newlyPriced = 0;
  const movers: SessionSummary['movers'] = [];
  for (const [seriesKey, r] of Object.entries(state.results)) {
    if (r.outcome === 'skipped') {
      skipped += 1;
      continue;
    }
    if (r.outcome === 'unchanged') unchanged += 1;
    else saved += 1;
    if (r.after === undefined) continue;
    const move = (r.after - (r.before ?? 0)) * r.copies;
    delta += move;
    if (r.before === undefined) newlyPriced += r.after * r.copies;
    if (move !== 0) movers.push({ seriesKey, delta: move, before: r.before, after: r.after });
  }
  return {
    saved,
    unchanged,
    skipped,
    delta,
    newlyPriced,
    movers: movers.toSorted((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, moversCount),
  };
}
