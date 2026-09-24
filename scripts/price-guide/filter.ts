import type { GuideValues, PriceGuideSnapshot } from '../../src/domain/catalog/price-guide';

/**
 * Turns Cardmarket's price guide (`price_guide_6.json`, 15.5 MB) into Settr's snapshot: only the
 * products the catalog links to, only the values the app shows (DATA_SOURCES.md §8.3). Pure, so
 * it's tested without the network.
 */

/** The fields Cardmarket publishes per product; anything can be missing or null. */
const FIELDS: Record<keyof GuideValues, string> = {
  low: 'low',
  trend: 'trend',
  avg1: 'avg1',
  avg7: 'avg7',
  avg30: 'avg30',
  lowHolo: 'low-holo',
  trendHolo: 'trend-holo',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function valuesOf(row: Record<string, unknown>): GuideValues | undefined {
  const values: GuideValues = {};
  let any = false;
  for (const [key, field] of Object.entries(FIELDS) as [keyof GuideValues, string][]) {
    const value = row[field];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      values[key] = value;
      any = true;
    }
  }
  return any ? values : undefined;
}

export function filterGuide(
  guide: unknown,
  productIds: ReadonlySet<number>,
  fetchedAt: string,
): PriceGuideSnapshot {
  if (!isRecord(guide) || !Array.isArray(guide.priceGuides)) {
    throw new Error('Unexpected price guide format: no priceGuides list');
  }
  const prices: PriceGuideSnapshot['prices'] = {};
  for (const row of guide.priceGuides) {
    if (!isRecord(row) || typeof row.idProduct !== 'number' || !productIds.has(row.idProduct)) {
      continue;
    }
    const values = valuesOf(row);
    if (values) prices[String(row.idProduct)] = values;
  }
  return {
    source: 'cardmarket-price-guide',
    ...(typeof guide.createdAt === 'string' ? { guideCreatedAt: guide.createdAt } : {}),
    fetchedAt,
    prices,
  };
}

/** A snapshot without values: the app finds the file and shows no suggestions. */
export function emptySnapshot(fetchedAt: string): PriceGuideSnapshot {
  return { source: 'cardmarket-price-guide', fetchedAt, prices: {} };
}

interface CatalogFiles {
  cards: unknown[];
  products: unknown[];
}

/** Every Cardmarket product id the catalog links to: card variants per language, sealed products. */
export function catalogProductIds({ cards, products }: CatalogFiles): Set<number> {
  const ids = new Set<number>();
  const add = (value: unknown) => {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) ids.add(value);
  };
  for (const card of cards) {
    if (!isRecord(card) || !Array.isArray(card.variants)) continue;
    for (const variant of card.variants) {
      if (!isRecord(variant) || !isRecord(variant.refs) || !isRecord(variant.refs.cardmarket)) {
        continue;
      }
      const { cardmarket } = variant.refs;
      add(cardmarket.default);
      if (isRecord(cardmarket.byLanguage)) Object.values(cardmarket.byLanguage).forEach(add);
    }
  }
  for (const product of products) {
    if (isRecord(product) && isRecord(product.refs)) add(product.refs.cardmarket);
  }
  return ids;
}
