import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardLanguage } from '../../src/domain/catalog-types';
import type { CardVariant } from '../../src/domain/catalog/schema';
import type { BuildProblems, BuiltCard, BuiltSet } from './build';
import type { CardOverlay, CuratedProduct } from './curated';
import { dirs } from './paths';
import type { PreviousCatalog } from './previous';

export interface CardmarketProduct {
  idProduct: number;
  name: string;
  categoryName?: string;
  idExpansion: number;
  idMetacard?: number;
  dateAdded?: string;
}

export interface CardmarketIndex {
  singles: Map<number, CardmarketProduct>;
  nonsingles: Map<number, CardmarketProduct>;
}

function readProducts(file: string): CardmarketProduct[] {
  const data = JSON.parse(readFileSync(file, 'utf8')) as
    | CardmarketProduct[]
    | { products: CardmarketProduct[] };
  return Array.isArray(data) ? data : data.products;
}

const index = (list: CardmarketProduct[]) => new Map(list.map((p) => [p.idProduct, p]));

/** Cardmarket's public product files (downloaded in CI; no CORS, never at runtime). */
export function loadCardmarket(): CardmarketIndex | null {
  const singles = join(dirs.cardmarket, 'products_singles_6.json');
  const nonsingles = join(dirs.cardmarket, 'products_nonsingles_6.json');
  if (!existsSync(singles) || !existsSync(nonsingles)) return null;
  return { singles: index(readProducts(singles)), nonsingles: index(readProducts(nonsingles)) };
}

/** Where an Asian set's products are on Cardmarket, as found in the product files. */
export interface ExpansionFinding {
  setId: string;
  /** The Japanese expansion used (configured, or found through TCGdex's ids). */
  japanese?: number;
  /** Expansions TCGdex's ids point to, with counts. */
  fromTcgdex: [number, number][];
  /**
   * Expansions holding products with the same metacards as this set's international
   * counterparts (the Japanese set itself, Simplified Chinese mirrors, reprints), with how many
   * of this set's cards each covers.
   */
  byMetacard: [number, number][];
}

export interface CardmarketReport {
  checked: number;
  /** Singles per configured expansion, to spot an expansion Cardmarket hasn't filled yet. */
  singlesPerExpansion: Record<number, number>;
  /** Asian prints: (card, variant) pairs with a product per card language, and those without. */
  asia: { ja: number; 'zh-cn': number; unresolved: string[] };
  expansions: ExpansionFinding[];
  /** Asian cards named by curation or PokéAPI, next to Cardmarket's (English) product name. */
  names: { cardId: string; ja: string; en: string; cardmarket: string }[];
  /** Singles of the Asian expansions that no card points to, to curate `cardmarket` overlays. */
  unmatchedSingles: CardmarketProduct[];
  /** Sealed products listed for the configured expansions, to curate `refs.cardmarket`. */
  sealedCandidates: CardmarketProduct[];
}

type AsianLanguage = 'ja' | 'zh-cn';

interface Slot {
  card: BuiltCard;
  variant: CardVariant;
  /** TCGdex's product for this variant. */
  tcgdex?: number;
  found: Partial<Record<AsianLanguage, number>>;
}

const tally = (values: number[]) => {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].toSorted((a, b) => b[1] - a[1]);
};

/**
 * Checks every card's Cardmarket ids against the product file and sorts the Asian ids into
 * `byLanguage` (DATA_SOURCES.md §6.2). TCGdex keeps one id per Asian card variant (for M6a the
 * Simplified Chinese product, for most Japanese sets the Japanese one, for some none), so the
 * expansion decides the language. Missing languages are found through `idMetacard`: from the
 * other Asian language, or from the international counterpart when TCGdex has no id at all.
 * Several prints of one card share a metacard (30 Pikachus), so those pair in number order, and
 * only when both sides have the same count.
 */
export function applyCardmarket(
  sets: BuiltSet[],
  cm: CardmarketIndex,
  products: CuratedProduct[],
  overlays: Map<string, Map<string, CardOverlay>>,
  problems: BuildProblems,
): CardmarketReport {
  const report: CardmarketReport = {
    checked: 0,
    singlesPerExpansion: {},
    asia: { ja: 0, 'zh-cn': 0, unresolved: [] },
    expansions: [],
    names: [],
    unmatchedSingles: [],
    sealedCandidates: [],
  };
  const expansions = new Set<number>();
  const sealedExpansions = new Set<number>();
  const intlExpansions = new Set<number>();
  for (const set of sets) {
    const expected = set.config.cardmarket;
    if (!expected) continue;
    if (expected.expansion) expansions.add(expected.expansion);
    if (expected.expansion && set.config.print === 'intl') intlExpansions.add(expected.expansion);
    if (expected.simplifiedChineseExpansion) expansions.add(expected.simplifiedChineseExpansion);
    for (const id of expected.sealedExpansions ?? []) sealedExpansions.add(id);
  }
  const byId = new Map(sets.flatMap((s) => s.cards.map((c) => [c.id, c] as const)));
  const byMetacard = new Map<number, CardmarketProduct[]>();
  for (const p of cm.singles.values())
    if (p.idMetacard) byMetacard.set(p.idMetacard, [...(byMetacard.get(p.idMetacard) ?? []), p]);

  for (const set of sets.filter((s) => s.config.print === 'intl')) {
    const expected = set.config.cardmarket?.expansion;
    if (!expected) continue;
    for (const card of set.cards)
      for (const variant of card.variants) {
        const id = variant.refs?.cardmarket?.default;
        if (!id) continue;
        report.checked++;
        const product = cm.singles.get(id);
        const promo = set.legend.get(variant.id)?.kind === 'stamp';
        if (!product)
          problems.warnings.push(
            `${card.id} ${variant.id}: Cardmarket product ${id} not in products_singles_6.json`,
          );
        else if (product.idExpansion !== expected && card.section !== 'energy' && !promo)
          problems.warnings.push(
            `${card.id} ${variant.id}: Cardmarket product ${id} is in expansion ${product.idExpansion}, expected ${expected}`,
          );
      }
  }

  for (const set of sets.filter((s) => s.config.print === 'asia')) {
    const expected = set.config.cardmarket ?? {};
    const slots: Slot[] = set.cards.flatMap((card) =>
      card.variants.map((variant) => {
        const tcgdex = card.source.variants.find((v) => v.id === variant.id)?.cardmarket;
        return { card, variant, ...(tcgdex ? { tcgdex } : {}), found: {} };
      }),
    );
    const finding: ExpansionFinding = {
      setId: set.config.id,
      fromTcgdex: tally(
        slots.flatMap((s) => {
          const product = s.tcgdex ? cm.singles.get(s.tcgdex) : undefined;
          return product ? [product.idExpansion] : [];
        }),
      ),
      byMetacard: tally(
        set.cards.flatMap((card) => {
          const partner = card.counterparts?.[0] ? byId.get(card.counterparts[0]) : undefined;
          const id = partner?.variants.find((v) => v.refs?.cardmarket?.default)?.refs?.cardmarket
            ?.default;
          const metacard = id ? cm.singles.get(id)?.idMetacard : undefined;
          const seen = new Set(
            (metacard ? (byMetacard.get(metacard) ?? []) : [])
              .map((p) => p.idExpansion)
              .filter((e) => !intlExpansions.has(e)),
          );
          return [...seen];
        }),
      ).slice(0, 6),
    };
    // Without a configured expansion, the one most of TCGdex's ids point to (when that's clear).
    const [top, second] = finding.fromTcgdex;
    const japanese =
      expected.expansion ??
      (top && top[1] >= 10 && (!second || top[1] >= 4 * second[1]) ? top[0] : undefined);
    if (japanese) finding.japanese = japanese;
    report.expansions.push(finding);
    if (japanese) expansions.add(japanese);
    for (const id of expected.sealedExpansions ?? []) sealedExpansions.add(id);

    const expansionOf: Record<AsianLanguage, number | undefined> = {
      ja: japanese,
      'zh-cn': expected.simplifiedChineseExpansion,
    };
    const languageOf = (product: CardmarketProduct | undefined): AsianLanguage | undefined =>
      product
        ? (['ja', 'zh-cn'] as const).find((l) => expansionOf[l] === product.idExpansion)
        : undefined;

    for (const slot of slots) {
      if (!slot.tcgdex) continue;
      report.checked++;
      const product = cm.singles.get(slot.tcgdex);
      const lang = languageOf(product);
      if (product && lang) slot.found[lang] = slot.tcgdex;
      else if (expansionOf.ja)
        problems.warnings.push(
          product
            ? `${slot.card.id} ${slot.variant.id}: Cardmarket product ${slot.tcgdex} is in expansion ${product.idExpansion}, expected ${expansionOf.ja}${expansionOf['zh-cn'] ? ` or ${expansionOf['zh-cn']}` : ''}`
            : `${slot.card.id} ${slot.variant.id}: Cardmarket product ${slot.tcgdex} not in products_singles_6.json`,
        );
    }

    /**
     * Fills `lang` for slots that lack it: each known product (another language's, or the
     * international counterpart's) names a metacard, and that metacard's products in `lang`'s
     * expansion pair with the slots in number order when the counts agree.
     */
    const fill = (lang: AsianLanguage, known: (slot: Slot) => number | undefined) => {
      const expansion = expansionOf[lang];
      if (!expansion) return;
      const groups = new Map<number, Slot[]>();
      for (const slot of slots) {
        if (slot.found[lang]) continue;
        const id = known(slot);
        const metacard = id ? cm.singles.get(id)?.idMetacard : undefined;
        if (metacard) groups.set(metacard, [...(groups.get(metacard) ?? []), slot]);
      }
      for (const [metacard, group] of groups) {
        const taken = new Set(slots.flatMap((s) => (s.found[lang] ? [s.found[lang]] : [])));
        const candidates = (byMetacard.get(metacard) ?? [])
          .filter((p) => p.idExpansion === expansion && !taken.has(p.idProduct))
          .map((p) => p.idProduct)
          .toSorted((a, b) => a - b);
        if (candidates.length !== group.length) {
          if (candidates.length)
            report.asia.unresolved.push(
              `${group.map((s) => `${s.card.id} ${s.variant.id}`).join(', ')}: ${group.length} cards vs ${candidates.length} ${lang} products (metacard ${metacard})`,
            );
          continue;
        }
        group
          .toSorted((a, b) => a.card.sort - b.card.sort || a.variant.id.localeCompare(b.variant.id))
          .forEach((slot, i) => {
            slot.found[lang] = candidates[i];
          });
      }
    };
    const otherLanguage = (lang: AsianLanguage) => (slot: Slot) =>
      slot.found[lang === 'ja' ? 'zh-cn' : 'ja'];
    const counterpart = (slot: Slot) => {
      // Only cards with one variant: a pattern reverse can't be told apart through its metacard.
      if (slot.card.variants.length !== 1) return undefined;
      const partner = slot.card.counterparts?.[0] ? byId.get(slot.card.counterparts[0]) : undefined;
      return partner?.variants.find((v) => v.refs?.cardmarket?.default)?.refs?.cardmarket?.default;
    };
    fill('ja', otherLanguage('ja'));
    fill('zh-cn', otherLanguage('zh-cn'));
    fill('ja', counterpart);
    fill('zh-cn', otherLanguage('zh-cn'));

    for (const slot of slots) {
      const source = slot.card.nameSource?.en;
      const id = slot.found.ja ?? slot.found['zh-cn'];
      const product = id ? cm.singles.get(id) : undefined;
      if (
        product &&
        (source === 'curated' || source === 'derived-pokeapi') &&
        slot.variant === slot.card.variants[0]
      )
        report.names.push({
          cardId: slot.card.id,
          ja: slot.card.name.ja ?? '',
          en: slot.card.name.en ?? '',
          cardmarket: product.name,
        });
    }
    const used = new Set<number>();
    for (const slot of slots) {
      if (!Object.keys(slot.found).length) continue;
      slot.variant.refs = { ...slot.variant.refs, cardmarket: { byLanguage: { ...slot.found } } };
      for (const id of Object.values(slot.found)) used.add(id);
    }
    for (const ids of Object.values(curatedIds(set, overlays)))
      for (const id of Object.values(ids)) used.add(id);
    report.unmatchedSingles.push(
      ...[...cm.singles.values()].filter(
        (p) =>
          (p.idExpansion === expansionOf.ja || p.idExpansion === expansionOf['zh-cn']) &&
          !used.has(p.idProduct),
      ),
    );
  }
  applyCuratedCardmarket(sets, overlays);
  for (const set of sets.filter((s) => s.config.print === 'asia'))
    for (const card of set.cards)
      for (const variant of card.variants) {
        const byLanguage = variant.refs?.cardmarket?.byLanguage;
        if (byLanguage?.ja) report.asia.ja++;
        if (byLanguage?.['zh-cn']) report.asia['zh-cn']++;
      }

  for (const p of cm.singles.values())
    if (expansions.has(p.idExpansion))
      report.singlesPerExpansion[p.idExpansion] =
        (report.singlesPerExpansion[p.idExpansion] ?? 0) + 1;
  const sealedIn = (expansion: number) =>
    expansions.has(expansion) || sealedExpansions.has(expansion);
  for (const product of products) {
    const id = product.refs?.cardmarket;
    if (!id) continue;
    const match = cm.nonsingles.get(id);
    if (!match)
      problems.errors.push(
        `${product.id}: Cardmarket product ${id} not in products_nonsingles_6.json`,
      );
    else if (!sealedIn(match.idExpansion))
      problems.warnings.push(
        `${product.id}: Cardmarket product ${id} is in expansion ${match.idExpansion}`,
      );
  }
  report.sealedCandidates = [...cm.nonsingles.values()].filter((p) => sealedIn(p.idExpansion));
  return report;
}

/** Curated `cardmarket` overlays of a set: card id → product per language (first variant). */
function curatedIds(set: BuiltSet, overlays: Map<string, Map<string, CardOverlay>>) {
  const ids: Record<string, Partial<Record<CardLanguage, number>>> = {};
  for (const card of set.cards) {
    const curated = overlays.get(set.config.id)?.get(card.localId)?.cardmarket;
    if (curated) ids[card.id] = curated;
  }
  return ids;
}

/** Curated ids win over TCGdex and the metacard match (both builds, so offline edits show up). */
function applyCuratedCardmarket(sets: BuiltSet[], overlays: Map<string, Map<string, CardOverlay>>) {
  for (const set of sets.filter((s) => s.config.print === 'asia')) {
    const curated = curatedIds(set, overlays);
    for (const card of set.cards) {
      const variant = card.variants[0];
      if (!variant || !curated[card.id]) continue;
      const byLanguage = { ...variant.refs?.cardmarket?.byLanguage, ...curated[card.id] };
      variant.refs = { ...variant.refs, cardmarket: { byLanguage } };
    }
  }
}

/** Offline builds keep the Asian ids the last network build sorted out (see applyCardmarket). */
export function carryOverCardmarket(
  sets: BuiltSet[],
  previous: PreviousCatalog,
  overlays: Map<string, Map<string, CardOverlay>>,
): void {
  for (const set of sets.filter((s) => s.config.print === 'asia')) {
    for (const card of set.cards) {
      const before = previous.cards.get(card.id);
      for (const variant of card.variants) {
        const cardmarket = before?.variants.find((v) => v.id === variant.id)?.refs?.cardmarket;
        if (cardmarket) variant.refs = { ...variant.refs, cardmarket };
      }
    }
  }
  applyCuratedCardmarket(sets, overlays);
}
