import type { CardLanguage } from '../catalog-types';
import type { CatalogCard, CatalogSetSummary, LocalizedText } from './schema';
import { CARD_SECTIONS, type NameSource } from './vocab';

/** Languages tried for display text in the German UI: German first, then English, then the rest. */
export const DISPLAY_LANGUAGE_ORDER: readonly CardLanguage[] = [
  'de',
  'en',
  'ja',
  'zh-tw',
  'zh-cn',
  'fr',
  'it',
  'es',
  'pt',
  'ko',
];

/** First available text in `order` (default: German first). */
export function pickText(
  text: LocalizedText | undefined,
  order: readonly CardLanguage[] = DISPLAY_LANGUAGE_ORDER,
): string {
  if (!text) return '';
  for (const lang of order) {
    const value = text[lang];
    if (value) return value;
  }
  return Object.values(text).find(Boolean) ?? '';
}

/** Name in a specific card language, falling back to the display order. */
export function textIn(text: LocalizedText | undefined, lang: CardLanguage): string {
  return text?.[lang] ?? pickText(text);
}

/** True when the name shown for `lang` is a translation Settr made, not the printed name. */
export function isTranslatedName(
  card: Pick<CatalogCard, 'nameSource'>,
  lang: CardLanguage,
): boolean {
  const source: NameSource | undefined = card.nameSource?.[lang];
  return source !== undefined && source !== 'official';
}

/** The set whose chunk holds `setId`'s cards: subsets live in their parent's file. */
export function chunkSetId(setId: string, sets: readonly CatalogSetSummary[]): string {
  return sets.find((s) => s.id === setId)?.parentSetId ?? setId;
}

const sectionRank = (section: CatalogCard['section']) => CARD_SECTIONS.indexOf(section);

/** Set order: section (main, secret, subset, energy, promo), then the numeric sort key. */
export function compareCards(
  a: Pick<CatalogCard, 'section' | 'sort'>,
  b: Pick<CatalogCard, 'section' | 'sort'>,
): number {
  return sectionRank(a.section) - sectionRank(b.section) || a.sort - b.sort;
}

/** Earliest release date across languages ('' if unknown). */
export function firstRelease(set: Pick<CatalogSetSummary, 'releaseDates'>): string {
  return Object.values(set.releaseDates).filter(Boolean).toSorted()[0] ?? '';
}

const byRelease = (a: CatalogSetSummary, b: CatalogSetSummary) =>
  firstRelease(b).localeCompare(firstRelease(a));

export interface SeriesGroup {
  id: string;
  name: LocalizedText;
  sets: CatalogSetSummary[];
}

/** Main sets grouped by series (era), newest series and sets first (Sets page, UX_SPEC.md §4.2). */
export function groupBySeries(sets: readonly CatalogSetSummary[]): SeriesGroup[] {
  const groups = new Map<string, SeriesGroup>();
  for (const set of sets) {
    if (set.kind !== 'main') continue;
    const group = groups.get(set.series.id) ?? {
      id: set.series.id,
      name: set.series.name,
      sets: [],
    };
    group.sets.push(set);
    groups.set(set.series.id, group);
  }
  const newest = (g: SeriesGroup) => g.sets.map(firstRelease).toSorted().at(-1) ?? '';
  return [...groups.values()]
    .map((group) => ({ ...group, sets: group.sets.toSorted(byRelease) }))
    .toSorted((a, b) => newest(b).localeCompare(newest(a)));
}

/**
 * Every print of a set's expansion, the set included, for the print switch (UX_SPEC.md §4.3): its
 * other prints and theirs, so a Japanese half of Mega-Entwicklung also offers the other half.
 * International first, then in catalog order.
 */
export function printsOf(
  set: CatalogSetSummary,
  sets: readonly CatalogSetSummary[],
): CatalogSetSummary[] {
  const ids = new Set(otherPrintIds(set));
  for (const id of otherPrintIds(set)) {
    const other = sets.find((s) => s.id === id);
    for (const sibling of other ? otherPrintIds(other) : []) ids.add(sibling);
  }
  ids.delete(set.id);
  const order = (s: CatalogSetSummary) => sets.findIndex((x) => x.id === s.id);
  return [set, ...sets.filter((s) => ids.has(s.id))].toSorted((a, b) =>
    a.print === b.print ? order(a) - order(b) : a.print === 'intl' ? -1 : 1,
  );
}

const otherPrintIds = (s: CatalogSetSummary) =>
  s.otherPrints ?? (s.otherPrint ? [s.otherPrint] : []);
