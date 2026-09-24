import { describe, expect, it } from 'vitest';
import { dayNumber } from '@/domain/dates';
import { money } from '@/domain/money';
import { DEFAULT_SETTINGS, type Holding, type PriceEntry } from '@/domain/schemas';
import {
  chartPoints,
  contextOf,
  isGradeKey,
  lastPerDay,
  newestFirst,
  priceTypeOf,
  purchaseBaseline,
  sourceOf,
} from './series';

const KEY = 'card|intl:30th:150|de|std|raw';

function entry(date: string, minor: number, createdAt: string, extra: Partial<PriceEntry> = {}) {
  return {
    id: `${date}-${createdAt}`,
    createdAt,
    updatedAt: createdAt,
    seriesKey: KEY,
    item: { kind: 'card', id: 'intl:30th:150' },
    language: 'de',
    variant: 'std',
    grade: 'raw',
    snapshot: { name: 'Pikachu-ex' },
    date,
    price: money(minor),
    priceType: 'from',
    source: 'cardmarket',
    origin: 'manual',
    ...extra,
  } satisfies PriceEntry;
}

function lot(quantity: number, priceTotal: number | undefined, extra: Partial<Holding> = {}) {
  return {
    id: `lot-${quantity}-${priceTotal}`,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    item: { kind: 'card', id: 'intl:30th:150' },
    snapshot: { name: 'Pikachu-ex' },
    language: 'de',
    variant: 'std',
    quantity,
    acquisition: {
      type: 'purchase',
      ...(priceTotal === undefined ? {} : { priceTotal: money(priceTotal) }),
    },
    disposals: [],
    tags: [],
    mediaIds: [],
    ...extra,
  } satisfies Holding;
}

describe('chart points', () => {
  it('orders entries by date, the later entry of a day last, and marks them by type', () => {
    const points = chartPoints([
      entry('2026-09-12', 3490, '2026-09-12T10:00:00.000Z'),
      entry('2026-08-02', 3150, '2026-08-02T10:00:00.000Z', { priceType: 'trend' }),
      entry('2026-09-12', 3390, '2026-09-12T09:00:00.000Z', { priceType: 'manual' }),
    ]);
    expect(points.map((p) => [p.day - dayNumber('2026-08-02'), p.value, p.marker])).toEqual([
      [0, 3150, 'square'],
      [41, 3390, 'ring'],
      [41, 3490, 'circle'],
    ]);
    // One point per day: the one valuation uses.
    expect(lastPerDay(points).map((p) => p.value)).toEqual([3150, 3490]);
  });

  it('leaves out prices in other currencies', () => {
    const usd = entry('2026-09-01', 999, '2026-09-01T10:00:00.000Z', {
      price: { minor: 999, currency: 'USD' },
    });
    expect(chartPoints([usd])).toEqual([]);
  });

  it('sorts newest first for lists', () => {
    const a = entry('2026-09-12', 1, '2026-09-12T09:00:00.000Z');
    const b = entry('2026-09-12', 2, '2026-09-12T10:00:00.000Z');
    const c = entry('2026-08-01', 3, '2026-09-20T10:00:00.000Z');
    expect([a, c, b].toSorted(newestFirst).map((e) => e.price.minor)).toEqual([2, 1, 3]);
  });
});

describe('purchase baseline', () => {
  it('averages the price per copy of the open lots in the series', () => {
    // 2 × 26,00 € and 1 × 20,00 € → 72,00 € ÷ 3 = 24,00 €
    expect(purchaseBaseline([lot(2, 5200), lot(1, 2000)], KEY)).toEqual({ minor: 2400, avg: true });
    expect(purchaseBaseline([lot(2, 5200)], KEY)).toEqual({ minor: 2600, avg: false });
  });

  it('skips lots of other series, without a price or sold out', () => {
    const english = lot(1, 9900, { language: 'en' });
    const unknown = lot(1, undefined);
    const sold = lot(1, 1000, {
      disposals: [{ id: 'd1', type: 'sale', date: '2026-09-10', quantity: 1 }],
    });
    expect(purchaseBaseline([english, unknown, sold], KEY)).toBeUndefined();
    expect(purchaseBaseline([english, unknown, sold, lot(1, 3000)], KEY)).toEqual({
      minor: 3000,
      avg: false,
    });
  });
});

describe('what an entry stores', () => {
  it('keeps the lookup context only for ab (DE) (R2.2)', () => {
    expect(contextOf('from', DEFAULT_SETTINGS, 'ja')).toEqual({
      sellerCountry: 'DE',
      language: 'ja',
      minCondition: 'NM',
    });
    expect(contextOf('trend', DEFAULT_SETTINGS, 'ja')).toBeUndefined();
    const anyLanguage = {
      ...DEFAULT_SETTINGS,
      price: {
        ...DEFAULT_SETTINGS.price,
        cardmarket: { ...DEFAULT_SETTINGS.price.cardmarket, matchLanguage: false },
      },
    };
    expect(contextOf('from', anyLanguage, 'ja')).toEqual({
      sellerCountry: 'DE',
      minCondition: 'NM',
    });
  });

  it('derives the source from the type', () => {
    expect(sourceOf('from')).toBe('cardmarket');
    expect(sourceOf('avg30')).toBe('cardmarket');
    expect(sourceOf('sold')).toBe('other');
    expect(sourceOf('manual')).toBe('other');
  });

  it('reads form values safely', () => {
    expect(priceTypeOf('trend')).toBe('trend');
    expect(priceTypeOf('nonsense')).toBe('from');
    expect(isGradeKey('raw')).toBe(true);
    expect(isGradeKey('psa-10')).toBe(true);
    expect(isGradeKey('psa')).toBe(false);
  });
});
