import type { CardLanguage } from '../catalog-types';
import type { CatalogCard, CatalogProduct } from './schema';
import { DISPLAY_LANGUAGE_ORDER, isTranslatedName, pickText } from './sets';

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

/** Einstellungen › Allgemein: which name a lot shows (Q3.6). */
export type NameDisplay = 'copy' | 'german' | 'original';

/**
 * The name of a lot in the collection: by default the one printed on the copy (its language),
 * else German, or the print's original language (JA for Asian sets).
 */
export function lotName(
  card: Pick<CatalogCard, 'name' | 'nameSource' | 'languages'>,
  copyLanguage: CardLanguage,
  display: NameDisplay,
): ShownName {
  if (display === 'german') return cardName(card, copyLanguage, 'german');
  if (display === 'original') return cardName(card, card.languages[0] ?? copyLanguage, 'card');
  return cardName(card, copyLanguage, 'card');
}

/** A product's name in the copy's language, else German first. */
export function productNameIn(
  product: Pick<CatalogProduct, 'name'>,
  lang: CardLanguage,
): ShownName {
  const text = product.name[lang];
  if (text) return { text, lang, translated: false };
  const fallback = DISPLAY_LANGUAGE_ORDER.find((l) => product.name[l]);
  return { text: pickText(product.name), lang: fallback ?? lang, translated: false };
}
