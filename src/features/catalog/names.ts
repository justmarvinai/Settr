import {
  isTranslatedName,
  pickText,
  type CatalogCard,
  type CatalogProduct,
} from '@/domain/catalog';
import type { CardLanguage } from '@/domain/catalog-types';

/**
 * Which name the catalog shows (I18N.md §1): German wherever it exists (the catalog default), or the
 * name printed on the copy in the chosen card language.
 */
export type NameMode = 'german' | 'card';

export interface ShownName {
  text: string;
  lang: CardLanguage;
  /** A translation Settr made (derived or curated), shown with "übersetzt". */
  translated: boolean;
}

export function cardName(
  card: Pick<CatalogCard, 'name' | 'nameSource'>,
  lang: CardLanguage,
  mode: NameMode,
): ShownName {
  const order: CardLanguage[] = mode === 'german' ? ['de', lang, 'en'] : [lang, 'de', 'en'];
  for (const candidate of order) {
    const text = card.name[candidate];
    if (text) return { text, lang: candidate, translated: isTranslatedName(card, candidate) };
  }
  return { text: pickText(card.name), lang, translated: false };
}

/** Names in the other languages, for the muted second line on detail pages. */
export function otherNames(
  card: Pick<CatalogCard, 'name' | 'nameSource' | 'languages'>,
  shown: CardLanguage,
): ShownName[] {
  const seen = new Set<string>([card.name[shown] ?? '']);
  const out: ShownName[] = [];
  for (const lang of ['de', ...card.languages] as CardLanguage[]) {
    const text = card.name[lang];
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push({ text, lang, translated: isTranslatedName(card, lang) });
  }
  return out;
}

export function productName(product: Pick<CatalogProduct, 'name'>): string {
  return pickText(product.name);
}
