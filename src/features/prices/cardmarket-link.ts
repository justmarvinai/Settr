import { cardmarketFilters, cardmarketSearchUrl, cardmarketUrl } from '@/catalog';
import type { CardLanguage } from '@/domain/catalog-types';
import type { Settings } from '@/domain/schemas';
import type { ItemInfo } from '@/features/collection';
import { languageLabel, m } from '@/i18n';

/** The Cardmarket button: the exact product with the preset filters, or a search. */
export interface CardmarketLink {
  href: string;
  exact: boolean;
  hint: string;
}

/**
 * The Cardmarket link of a copy (PRC-06): the exact product filtered the way Marvin's price rule
 * reads it (R2.2, Einstellungen › Preise), else Cardmarket's search for the name and number.
 */
export function cardmarketLinkOf(
  info: Pick<ItemInfo, 'ref' | 'name' | 'number' | 'languages' | 'cardmarketId'>,
  language: CardLanguage,
  variant: string | undefined,
  settings: Settings,
): CardmarketLink {
  const productId = info.cardmarketId?.(language, variant);
  if (productId) {
    const hint = { language: languageLabel(language) };
    return {
      href: cardmarketUrl(productId, cardmarketFilters(settings, language)),
      exact: true,
      hint:
        info.ref.kind === 'card'
          ? m.catalog_cardmarket_filters(hint)
          : m.catalog_cardmarket_filters_sealed(hint),
    };
  }
  // Cardmarket names its products in English.
  const name = info.name(info.languages.includes('en') ? 'en' : language).text;
  const query = [name, info.ref.kind === 'card' ? info.number : undefined].filter(Boolean);
  return {
    href: cardmarketSearchUrl(query.join(' ')),
    exact: false,
    hint: m.catalog_cardmarket_search_hint(),
  };
}
