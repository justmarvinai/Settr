import type { CardLanguage, Condition } from '@/domain/catalog-types';
import { CONDITIONS } from '@/domain/catalog-types';
import type { CatalogCard, CatalogProduct } from '@/domain/catalog';
import type { Settings } from '@/domain/schemas';

/**
 * Cardmarket deep links (PRC-06, DATA_SOURCES.md §8.1): the exact product, filtered to the copy's
 * language, German sellers and Near Mint or better, which is exactly the offer Marvin's price rule
 * reads (R2.2). Verified by Marvin on 2026-09-23 (language, sellerCountry, minCondition).
 */
const LANGUAGE_IDS: Partial<Record<CardLanguage, number>> = {
  en: 1,
  fr: 2,
  de: 3,
  es: 4,
  it: 5,
  'zh-cn': 6,
  ja: 7,
  pt: 8,
  ko: 10,
  'zh-tw': 11,
};
const GERMANY = 7;
/** Cardmarket's country ids for the seller filter (only Germany is verified, §8.1). */
const COUNTRY_IDS: Record<string, number> = { DE: GERMANY };
const BASE = 'https://www.cardmarket.com/de/Pokemon/Products';

export interface CardmarketFilters {
  /** The copy's language; leave out to see every language. */
  language?: CardLanguage;
  /** Cardmarket country id; Germany (7) is the default of Marvin's price rule. */
  sellerCountry?: number;
  minCondition?: Condition;
}

/**
 * The product a copy in `lang` is sold as. Traditional Chinese copies are listed on the Japanese
 * product under Cardmarket's T-Chinese language (R2.3); Simplified Chinese ones have their own.
 */
export function cardmarketProductId(
  card: Pick<CatalogCard, 'variants'>,
  variantId: string,
  lang: CardLanguage,
): number | undefined {
  const refs = card.variants.find((v) => v.id === variantId)?.refs?.cardmarket;
  if (!refs) return undefined;
  return refs.byLanguage?.[lang === 'zh-tw' ? 'ja' : lang] ?? refs.default;
}

export function cardmarketUrl(
  productId: number,
  { language, sellerCountry = GERMANY, minCondition = 'NM' }: CardmarketFilters = {},
): string {
  const params = new URLSearchParams({ idProduct: String(productId) });
  const languageId = language ? LANGUAGE_IDS[language] : undefined;
  if (languageId) params.set('language', String(languageId));
  params.set('sellerCountry', String(sellerCountry));
  params.set('minCondition', String(CONDITIONS.indexOf(minCondition) + 1));
  return `${BASE}?${params.toString()}`;
}

/** Fallback when the catalog has no product id: Cardmarket's own search. */
export function cardmarketSearchUrl(query: string): string {
  return `${BASE}/Search?${new URLSearchParams({ searchString: query }).toString()}`;
}

export function productCardmarketUrl(
  product: Pick<CatalogProduct, 'refs'>,
  filters?: CardmarketFilters,
): string | undefined {
  const id = product.refs?.cardmarket;
  return id ? cardmarketUrl(id, filters) : undefined;
}

/** The link filters from Einstellungen › Preise (R2.2 defaults: DE sellers, copy's language, NM+). */
export function cardmarketFilters(settings: Settings, lang: CardLanguage): CardmarketFilters {
  const { cardmarket } = settings.price;
  return {
    ...(cardmarket.matchLanguage ? { language: lang } : {}),
    ...(COUNTRY_IDS[cardmarket.sellerCountry]
      ? { sellerCountry: COUNTRY_IDS[cardmarket.sellerCountry] }
      : {}),
    minCondition: cardmarket.minCondition,
  };
}
