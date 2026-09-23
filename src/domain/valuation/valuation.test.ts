import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysBetween } from '../dates';
import { money } from '../money';
import type { Disposal, Holding } from '../schemas/holding';
import type { PriceEntry } from '../schemas/price';
import { cardSeriesKey, sealedSeriesKey, seriesKeyOf } from '../series';
import {
  gridDays,
  portfolioSeries,
  portfolioTotals,
  priceSessionSchema,
  rankMovers,
  realizedTotal,
  seriesStates,
  sessionQueue,
  sessionSummary,
  valueLots,
  type PriceSessionState,
  type ValuationOptions,
} from './index';

let seq = 0;
const eur = (minor: number) => money(minor, 'EUR');

function lot(patch: Partial<Holding> = {}): Holding {
  seq += 1;
  const stamp = '2026-09-01T10:00:00.000Z';
  return {
    id: `0192f1c3-7b2a-7c0e-9d3f-${String(seq).padStart(12, '0')}`,
    createdAt: stamp,
    updatedAt: stamp,
    item: { kind: 'card', id: 'x' },
    snapshot: { name: 'X' },
    language: 'de',
    variant: 'std',
    condition: 'NM',
    quantity: 1,
    acquisition: { type: 'purchase' },
    disposals: [],
    tags: [],
    mediaIds: [],
    ...patch,
  };
}

function sale(patch: Partial<Disposal>): Disposal {
  seq += 1;
  return {
    id: `0192f1c3-7b2a-7c0e-9d3f-d${String(seq).padStart(11, '0')}`,
    type: 'sale',
    quantity: 1,
    date: '2026-09-10',
    ...patch,
  };
}

type Observation = Pick<PriceEntry, 'date' | 'createdAt' | 'price'>;
const obs = (date: string, minor: number, createdAt = `${date}T12:00:00.000Z`): Observation => ({
  date,
  createdAt,
  price: eur(minor),
});

const X = cardSeriesKey('x', 'de', 'std', 'raw');
const Z = cardSeriesKey('z', 'de', 'std', 'raw');
const ETB = sealedSeriesKey('etb', 'de');

/**
 * Hand-calculated fixture (ROADMAP.md M4 exit criterion). Today is 23.09.2026, stale after 14 days.
 *   A  2 × X, bought 01.09. for 10,00        → X priced 8,00 on 10.09.  value 16,00  P/L +6,00
 *   B  1 × Y (EN), bought 02.09. for 20,00   → no price                  unpriced
 *   C  1 × ETB, bought 03.09. for 59,99      → priced 65,00 on 06.09.    value 65,00  P/L +5,01 (stale)
 *   D  1 × X, entered 04.09., price unknown  → value 8,00, no P/L
 *   E  3 × Z for 3,00, 2 sold 08.09. for 5,00 − 0,50 fees → realized +2,50; 1 left, Z 1,50 → P/L +0,50
 *   F  1 × X (LP) bought 07.09. for 4,00, Eigener Wert 3,00 since 09.09. → P/L −1,00
 */
const A = lot({
  quantity: 2,
  acquisition: { type: 'purchase', date: '2026-09-01', priceTotal: eur(1000) },
});
const B = lot({
  item: { kind: 'card', id: 'y' },
  language: 'en',
  acquisition: { type: 'purchase', date: '2026-09-02', priceTotal: eur(2000) },
});
const C = lot({
  item: { kind: 'sealed', id: 'etb' },
  variant: undefined,
  condition: undefined,
  sealedState: 'sealed',
  acquisition: { type: 'purchase', date: '2026-09-03', priceTotal: eur(5999) },
});
const D = lot({ acquisition: { type: 'purchase', date: '2026-09-04' } });
const E = lot({
  item: { kind: 'card', id: 'z' },
  quantity: 3,
  acquisition: { type: 'purchase', date: '2026-09-01', priceTotal: eur(300) },
  disposals: [
    sale({ quantity: 2, date: '2026-09-08', proceedsTotal: eur(500), feesTotal: eur(50) }),
  ],
});
const F = lot({
  condition: 'LP',
  acquisition: { type: 'purchase', date: '2026-09-07', priceTotal: eur(400) },
  valueOverride: { price: eur(300), date: '2026-09-09' },
});
const HOLDINGS = [A, B, C, D, E, F];

const PRICES = new Map<string, Observation[]>([
  [X, [obs('2026-09-05', 700), obs('2026-09-10', 800)]],
  [ETB, [obs('2026-09-06', 6500)]],
  [Z, [obs('2026-09-09', 150)]],
]);

const latestOf = (prices: ReadonlyMap<string, readonly Observation[]>) =>
  new Map(
    [...prices].map(([key, list]) => [
      key,
      list
        .toSorted((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
        .at(-1) ?? obs('1970-01-01', 0),
    ]),
  );

const OPTIONS: ValuationOptions = { today: '2026-09-23', staleAfterDays: 14, unpriced: 'exclude' };

/** Whether lot A's price counts as stale on `today`. */
const staleOn = (today: string) =>
  valueLots([A], latestOf(PRICES), { ...OPTIONS, today })[0]?.stale;

describe('valuation (DATA_MODEL §6.3, §6.4)', () => {
  const values = valueLots(HOLDINGS, latestOf(PRICES), OPTIONS);
  const byId = new Map(values.map((v) => [v.holding.id, v]));

  it('values each lot by its own series or its Eigener Wert', () => {
    expect(byId.get(A.id)?.value).toEqual(eur(1600));
    expect(byId.get(A.id)?.pl).toEqual(eur(600));
    expect(byId.get(A.id)?.plRatio).toBeCloseTo(0.6);
    expect(byId.get(B.id)?.value).toBeUndefined();
    expect(byId.get(C.id)).toMatchObject({ value: eur(6500), pl: eur(501), stale: true });
    expect(byId.get(D.id)).toMatchObject({ value: eur(800), cost: undefined, pl: undefined });
    expect(byId.get(E.id)).toMatchObject({
      remaining: 1,
      value: eur(150),
      pl: eur(50),
      stale: false,
    });
    expect(byId.get(F.id)?.unit).toEqual({
      price: eur(300),
      date: '2026-09-09',
      source: 'override',
    });
    expect(byId.get(F.id)?.pl).toEqual(eur(-100));
  });

  it('adds up to the dashboard numbers', () => {
    const totals = portfolioTotals(values, realizedTotal(HOLDINGS));
    expect(totals).toMatchObject({
      value: eur(9350),
      invested: eur(9499),
      pricedCost: eur(7499),
      pl: eur(1051),
      realized: eur(250),
      lots: 6,
      copies: 7,
      unpriced: 1,
      stale: 1,
      unknownCost: 1,
    });
    expect(totals.plRatio).toBeCloseTo(1051 / 7499);
  });

  it('values unpriced lots at cost when the setting says so', () => {
    const atCost = portfolioTotals(
      valueLots(HOLDINGS, latestOf(PRICES), { ...OPTIONS, unpriced: 'cost' }),
    );
    expect(atCost).toMatchObject({ value: eur(11350), pricedCost: eur(9499), pl: eur(1051) });
    expect(atCost.unpriced).toBe(1); // still counted as without a price
  });

  it('marks a price stale after the threshold, not on it', () => {
    expect(staleOn('2026-09-24')).toBe(false); // 14 days after 10.09.
    expect(staleOn('2026-09-25')).toBe(true);
  });

  it('never values a lot by another language (R2.6)', () => {
    const english = lot({
      language: 'en',
      acquisition: { type: 'purchase', priceTotal: eur(100) },
    });
    expect(seriesKeyOf(english)).not.toBe(X);
    expect(valueLots([english], latestOf(PRICES), OPTIONS)[0]?.value).toBeUndefined();
  });

  it('ranks movers by euros or percent', () => {
    expect(rankMovers(values, 'abs', 5).gainers.map((v) => v.holding.id)).toEqual([
      A.id,
      C.id,
      E.id,
    ]);
    expect(rankMovers(values, 'ratio', 5).gainers.map((v) => v.holding.id)).toEqual([
      A.id,
      E.id,
      C.id,
    ]);
    expect(rankMovers(values, 'abs', 5).losers.map((v) => v.holding.id)).toEqual([F.id]);
  });
});

describe('portfolio time series (DATA_MODEL §6.5)', () => {
  const points = portfolioSeries(HOLDINGS, PRICES, { today: '2026-09-23', unpriced: 'exclude' });
  const on = (date: string) => points.find((p) => p.date === date);

  it('starts at the first purchase and ends today', () => {
    expect(points[0]?.date).toBe('2026-09-01');
    expect(points.at(-1)?.date).toBe('2026-09-23');
    expect(points).toHaveLength(23);
  });

  it('carries prices forward and follows purchases and sales', () => {
    expect(on('2026-09-01')).toEqual({
      date: '2026-09-01',
      value: 0,
      pricedValue: 0,
      pricedCost: 0,
      invested: 1300,
    });
    // A and D at 7,00 (price of 05.09.), only A has a cost.
    expect(on('2026-09-05')).toMatchObject({ value: 2100, pricedValue: 1400, pricedCost: 1000 });
    expect(on('2026-09-05')?.invested).toBe(1000 + 2000 + 5999 + 300);
    // E sold two of three on 08.09.: one unit's cost (1,00) is left.
    expect(on('2026-09-08')?.invested).toBe(1000 + 2000 + 5999 + 100 + 400);
    // F's Eigener Wert applies from 09.09.; before, it follows X.
    expect(on('2026-09-07')).toMatchObject({ value: 2100 + 6500 + 700 });
    expect(on('2026-09-09')).toMatchObject({ value: 1400 + 6500 + 700 + 150 + 300 });
  });

  it('ends on the same numbers as the valuation for today', () => {
    const totals = portfolioTotals(valueLots(HOLDINGS, latestOf(PRICES), OPTIONS));
    const last = points.at(-1);
    expect(last?.value).toBe(totals.value.minor);
    expect(last?.invested).toBe(totals.invested.minor);
    expect((last?.pricedValue ?? 0) - (last?.pricedCost ?? 0)).toBe(totals.pl.minor);
  });

  it('agrees with the valuation for any lots and prices', () => {
    const day = fc.integer({ min: 0, max: 40 }).map((n) => addDays('2026-08-15', n));
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            item: fc.constantFrom('x', 'z'),
            quantity: fc.integer({ min: 1, max: 5 }),
            cost: fc.option(fc.integer({ min: 0, max: 50_000 }), { nil: undefined }),
            bought: day,
            sold: fc.integer({ min: 0, max: 5 }),
            override: fc.option(fc.tuple(fc.integer({ min: 0, max: 9_999 }), day), {
              nil: undefined,
            }),
          }),
          { maxLength: 8 },
        ),
        fc.array(fc.tuple(fc.constantFrom(X, Z), day, fc.integer({ min: 0, max: 99_999 })), {
          maxLength: 10,
        }),
        fc.constantFrom<'exclude' | 'cost'>('exclude', 'cost'),
        (lots, entries, unpriced) => {
          const today = '2026-09-30';
          const holdings = lots.map((l) =>
            lot({
              item: { kind: 'card', id: l.item },
              quantity: l.quantity,
              acquisition: {
                type: 'purchase',
                date: l.bought,
                ...(l.cost === undefined ? {} : { priceTotal: eur(l.cost) }),
              },
              disposals:
                l.sold > 0 && l.sold <= l.quantity
                  ? [sale({ quantity: l.sold, date: addDays(l.bought, 1) })]
                  : [],
              ...(l.override
                ? { valueOverride: { price: eur(l.override[0]), date: l.override[1] } }
                : {}),
            }),
          );
          const prices = new Map<string, Observation[]>();
          entries.forEach(([key, date, minor], index) =>
            prices.set(key, [
              ...(prices.get(key) ?? []),
              obs(date, minor, `${date}T12:00:${String(index).padStart(2, '0')}.000Z`),
            ]),
          );
          const options = { today, staleAfterDays: 14, unpriced };
          const totals = portfolioTotals(valueLots(holdings, latestOf(prices), options));
          const last = portfolioSeries(holdings, prices, { today, unpriced }).at(-1);
          expect(last?.value ?? 0).toBe(totals.value.minor);
          expect(last?.invested ?? 0).toBe(totals.invested.minor);
          expect((last?.pricedValue ?? 0) - (last?.pricedCost ?? 0)).toBe(totals.pl.minor);
        },
      ),
    );
  });
});

describe('dates', () => {
  it('counts days and clamps months', () => {
    expect(daysBetween('2026-09-10', '2026-09-24')).toBe(14);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -12)).toBe('2025-01-15');
  });

  it('steps weekly beyond two years and always ends today', () => {
    const days = gridDays('2023-01-01', '2026-09-23');
    expect(days.length).toBeLessThan(200);
    expect(days.at(-1)).toBe(gridDays('2026-09-23', '2026-09-23')[0]);
  });
});

describe('price session (PRC-04)', () => {
  const states = seriesStates(HOLDINGS, latestOf(PRICES), {
    today: '2026-09-23',
    staleAfterDays: 14,
  });
  const byKey = new Map(states.map((s) => [s.seriesKey, s]));
  const Y = cardSeriesKey('y', 'en', 'std', 'raw');

  it('walks price series, leaving out lots valued by their Eigener Wert', () => {
    expect(byKey.get(X)).toMatchObject({ copies: 3, value: 2400, unitCost: 500, stale: false });
    expect(byKey.get(X)?.lots.map((l) => l.id)).toEqual([A.id, D.id]);
    expect(byKey.get(Y)).toMatchObject({ copies: 1, value: 0, unitCost: 2000, latest: undefined });
    expect(byKey.get(ETB)).toMatchObject({ value: 6500, unitCost: 5999, stale: true });
    // One of three copies of Z is left; it cost 1,00 €.
    expect(byKey.get(Z)).toMatchObject({ copies: 1, value: 150, unitCost: 100, stale: false });
  });

  it('queues a scope in the chosen order', () => {
    expect(sessionQueue(states, 'stale', 'value')).toEqual([ETB]);
    expect(sessionQueue(states, 'unpriced', 'value')).toEqual([Y]);
    expect(sessionQueue(states, 'all', 'value')).toEqual([ETB, X, Z, Y]);
    expect(sessionQueue(states, 'all', 'oldest')).toEqual([Y, ETB, Z, X]);
    expect(sessionQueue(states, 'selection', 'value', { selection: new Set([Z, X]) })).toEqual([
      X,
      Z,
    ]);
  });

  it('sums up what a session changed', () => {
    const state: PriceSessionState = {
      scope: 'all',
      order: 'value',
      queue: [ETB, X, Z, Y],
      position: 4,
      startedAt: '2026-09-23T10:00:00.000Z',
      results: {
        [X]: { outcome: 'saved', before: 800, after: 900, copies: 3 },
        [ETB]: { outcome: 'unchanged', before: 6500, after: 6500, copies: 1 },
        [Y]: { outcome: 'saved', after: 1000, copies: 1 },
        [Z]: { outcome: 'skipped', copies: 1 },
      },
    };
    expect(sessionSummary(state)).toEqual({
      saved: 2,
      unchanged: 1,
      skipped: 1,
      delta: 1300,
      newlyPriced: 1000,
      movers: [
        { seriesKey: Y, delta: 1000, before: undefined, after: 1000 },
        { seriesKey: X, delta: 300, before: 800, after: 900 },
      ],
    });
    expect(priceSessionSchema.safeParse({ ...state, position: -1 }).success).toBe(false);
  });
});
