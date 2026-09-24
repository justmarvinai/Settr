import { describe, expect, it } from 'vitest';
import { guideSuggestion, priceGuideSnapshotSchema } from '../../src/domain/catalog/price-guide';
import { catalogProductIds, emptySnapshot, filterGuide } from './filter';

const guide = {
  version: 1,
  createdAt: '2026-09-23T02:48:12+0200',
  priceGuides: [
    { idProduct: 890360, idCategory: 51, low: 4.5, trend: 5.12, avg1: 5, avg7: 5.2, avg30: null },
    { idProduct: 895551, low: 49.9, trend: 54.95, 'low-holo': null, 'trend-holo': 0 },
    { idProduct: 111, low: 1, trend: 2 }, // not in the catalog
    { idProduct: 777, low: null, trend: null }, // nothing to show
    { idProduct: 'x', low: 1 },
  ],
};

describe('price guide snapshot', () => {
  it('keeps catalog products and the values Settr shows', () => {
    const snapshot = filterGuide(guide, new Set([890360, 895551, 777]), '2026-09-23T03:30:00Z');
    expect(priceGuideSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(snapshot).toEqual({
      source: 'cardmarket-price-guide',
      guideCreatedAt: '2026-09-23T02:48:12+0200',
      fetchedAt: '2026-09-23T03:30:00Z',
      prices: {
        '890360': { low: 4.5, trend: 5.12, avg1: 5, avg7: 5.2 },
        '895551': { low: 49.9, trend: 54.95 },
      },
    });
  });

  it('refuses a file that is not a price guide', () => {
    expect(() => filterGuide({ products: [] }, new Set(), 'now')).toThrow(/priceGuides/);
  });

  it('collects every linked product: variants per language and sealed', () => {
    const ids = catalogProductIds({
      cards: [
        { variants: [{ id: 'std', refs: { cardmarket: { default: 1, byLanguage: { ja: 2 } } } }] },
        { variants: [{ id: 'std' }] },
      ],
      products: [{ refs: { cardmarket: 3 } }, { refs: {} }],
    });
    expect([...ids].toSorted((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('suggests ab and Trend in cents, for three days, never for missing products', () => {
    const snapshot = filterGuide(guide, new Set([890360]), 'now');
    expect(guideSuggestion(snapshot, 890360, { today: '2026-09-24' })).toEqual({
      date: '2026-09-23',
      low: 450,
      trend: 512,
    });
    expect(guideSuggestion(snapshot, 890360, { today: '2026-09-26' })).toBeDefined();
    expect(guideSuggestion(snapshot, 890360, { today: '2026-09-27' })).toBeUndefined();
    expect(guideSuggestion(snapshot, 895551, { today: '2026-09-24' })).toBeUndefined();
    expect(guideSuggestion(snapshot, 890360, { today: '2026-09-24', reverse: true })).toBe(
      undefined,
    );
    expect(guideSuggestion(emptySnapshot('now'), 890360, { today: '2026-09-24' })).toBe(undefined);
  });
});
