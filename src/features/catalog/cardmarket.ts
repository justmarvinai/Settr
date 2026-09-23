import type { CardmarketFilters } from '@/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import type { Settings } from '@/domain/schemas';

/** Cardmarket's country ids for the seller filter (only Germany is verified, §8.1). */
const COUNTRY_IDS: Record<string, number> = { DE: 7 };

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
