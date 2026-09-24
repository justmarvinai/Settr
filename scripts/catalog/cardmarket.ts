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

/** Where an international set's singles are on Cardmarket. */
export interface InternationalFinding {
  setId: string;
  /** The expansion used: configured, TCGdex's for the set, or the parent set's. */
  expansion?: number;
  /** Expansions TCGdex's ids point to, with counts. */
  fromTcgdex: [number, number][];
  /** Cards that got their product by name (TCGdex has none), and those that didn't. */
  byName: number;
  unresolved: string[];
  /** The expansion's singles no card points to, when cards were matched by name. */
  unmatched: CardmarketProduct[];
}

export interface CardmarketReport {
  checked: number;
  /** Singles per configured expansion, to spot an expansion Cardmarket hasn't filled yet. */
  singlesPerExpansion: Record<number, number>;
  /** Asian prints: (card, variant) pairs with a product per card language, and those without. */
  asia: { ja: number; 'zh-cn': number; unresolved: string[] };
  expansions: ExpansionFinding[];
  international: InternationalFinding[];
  /** Asian cards named by curation or PokéAPI, next to Cardmarket's (English) product name. */
  names: { cardId: string; ja: string; en: string; cardmarket: string }[];
  /** Singles of the Asian expansions that no card points to, to curate `cardmarket` overlays. */
  unmatchedSingles: CardmarketProduct[];
  /** Sealed products listed for the configured expansions, to curate `refs.cardmarket`. */
  sealedCandidates: CardmarketProduct[];
  /** A sealed product of each expansion the findings name, to tell what the expansion is. */
  expansionHints: Record<number, string>;
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
    international: [],
    names: [],
    unmatchedSingles: [],
    sealedCandidates: [],
    expansionHints: {},
  };
  const expansions = new Set<number>();
  const sealedExpansions = new Set<number>();
  const intlExpansions = new Set<number>();
  for (const set of sets) {
    const expected = set.config.cardmarket;
    if (!expected) continue;
    for (const id of [expected.expansion, ...(expected.otherExpansions ?? [])]) {
      if (!id) continue;
      expansions.add(id);
      if (set.config.print === 'intl') intlExpansions.add(id);
    }
    if (expected.simplifiedChineseExpansion) expansions.add(expected.simplifiedChineseExpansion);
    for (const id of expected.sealedExpansions ?? []) sealedExpansions.add(id);
  }
  const byId = new Map(sets.flatMap((s) => s.cards.map((c) => [c.id, c] as const)));
  const byMetacard = new Map<number, CardmarketProduct[]>();
  for (const p of cm.singles.values())
    if (p.idMetacard) byMetacard.set(p.idMetacard, [...(byMetacard.get(p.idMetacard) ?? []), p]);

  for (const set of sets.filter((s) => s.config.print === 'intl')) {
    const expected = internationalExpansion(set, sets);
    const finding: InternationalFinding = {
      setId: set.config.id,
      ...(expected ? { expansion: expected } : {}),
      fromTcgdex: tally(
        set.cards.flatMap((card) =>
          card.variants.flatMap((variant) => {
            const product = cm.singles.get(variant.refs?.cardmarket?.default ?? 0);
            return product ? [product.idExpansion] : [];
          }),
        ),
      ),
      byName: 0,
      unresolved: [],
      unmatched: [],
    };
    report.international.push(finding);
    if (!expected) continue;
    matchByName(set, cm, expected, curatedIds(set, overlays), finding);
    const allowed = new Set([expected, ...(set.config.cardmarket?.otherExpansions ?? [])]);
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
        else if (!allowed.has(product.idExpansion) && card.section !== 'energy' && !promo)
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
    // Prints Cardmarket files apart (MEGA Dream ex's reverse holos) are Japanese products too.
    const expansionsOf: Record<AsianLanguage, number[]> = {
      ja: japanese ? [japanese, ...(expected.otherExpansions ?? [])] : [],
      'zh-cn': expected.simplifiedChineseExpansion ? [expected.simplifiedChineseExpansion] : [],
    };
    for (const id of expansionsOf.ja) expansions.add(id);
    const languageOf = (product: CardmarketProduct | undefined): AsianLanguage | undefined =>
      product
        ? (['ja', 'zh-cn'] as const).find((l) => expansionsOf[l].includes(product.idExpansion))
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
            ? `${slot.card.id} ${slot.variant.id}: Cardmarket product ${slot.tcgdex} is in expansion ${product.idExpansion}, expected ${[...expansionsOf.ja, ...expansionsOf['zh-cn']].join(' or ')}`
            : `${slot.card.id} ${slot.variant.id}: Cardmarket product ${slot.tcgdex} not in products_singles_6.json`,
        );
    }

    // Curated ids count as found, so the metacard match neither reuses nor reports them.
    const curated = curatedIds(set, overlays);
    for (const slot of slots)
      if (slot.variant === slot.card.variants[0])
        for (const lang of ['ja', 'zh-cn'] as const) {
          const id = curated[slot.card.id]?.[lang];
          if (id) slot.found[lang] = id;
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
    for (const ids of Object.values(curated)) for (const id of Object.values(ids)) used.add(id);
    report.unmatchedSingles.push(
      ...[...cm.singles.values()].filter(
        (p) => languageOf(p) !== undefined && !used.has(p.idProduct),
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
  const named = new Set(
    report.expansions.flatMap((e) => [...e.fromTcgdex, ...e.byMetacard].map(([id]) => id)),
  );
  for (const p of [...cm.nonsingles.values()].toSorted((a, b) => a.idProduct - b.idProduct)) {
    const hint = report.expansionHints[p.idExpansion];
    // A booster says best what an expansion is; else its first product.
    if (named.has(p.idExpansion) && (!hint || (/booster/i.test(p.name) && !/booster/i.test(hint))))
      report.expansionHints[p.idExpansion] = p.name;
  }
  return report;
}

/** The variants an international card is sold as on its own product (reverse holos filtered). */
const PLAIN_VARIANTS = new Set(['normal', 'holo', 'reverse']);

const ownExpansion = (set: BuiltSet) =>
  set.config.cardmarket?.expansion ?? set.raw.thirdParty?.cardmarket;

/** An international set's expansion: configured, TCGdex's for the set, or its parent set's. */
function internationalExpansion(set: BuiltSet, sets: readonly BuiltSet[]): number | undefined {
  const parent = sets.find((s) => s.config.id === set.config.parentSetId);
  return ownExpansion(set) ?? (parent ? ownExpansion(parent) : undefined);
}

/** A card's variants sold on its own product. */
const plainVariants = (card: BuiltCard) => card.variants.filter((v) => PLAIN_VARIANTS.has(v.id));

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}

const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Cardmarket's product name: the card name, then its abilities and attacks in brackets. */
function productKey(name: string): { base: string; moves: string } {
  const bracket = /^(.*?)\s*\[(.*)\]?\s*$/.exec(name);
  const base = bracket?.[1] ?? name;
  const moves = (bracket?.[2] ?? '').replace(/\]$/, '');
  return {
    base: normalize(base),
    moves: moves
      .split('|')
      .map((m) => normalize(m))
      .filter(Boolean)
      .toSorted()
      .join('|'),
  };
}

function cardKey(card: BuiltCard): { base: string; moves: string } {
  const { raw } = card.source;
  return {
    base: normalize(raw.name.en ?? card.name.en ?? ''),
    moves: [...(raw.abilities ?? []), ...(raw.attacks ?? [])]
      .flatMap((m) => (m.name.en ? [normalize(m.name.en)] : []))
      .toSorted()
      .join('|'),
  };
}

/**
 * Products for the cards of an international set TCGdex has no Cardmarket id for (Karmesin &
 * Purpur, Nacht in Flammen): the expansion's singles that no other card uses, by English name, and
 * by abilities and attacks where that tells prints apart. Several prints of one card (a full art,
 * a Special Illustration Rare) pair in number order, and only when both sides have the same
 * count. The product goes to the card's plain variants; its reverse holo is filtered for.
 */
function matchByName(
  set: BuiltSet,
  cm: CardmarketIndex,
  expansion: number,
  curated: Record<string, Partial<Record<CardLanguage, number>>>,
  finding: InternationalFinding,
): void {
  const missing = set.cards.filter(
    (card) =>
      !curated[card.id] &&
      plainVariants(card).length > 0 &&
      plainVariants(card).every((v) => !v.refs?.cardmarket?.default),
  );
  if (!missing.length) return;
  const used = new Set([
    ...set.cards.flatMap((c) => c.variants.flatMap((v) => v.refs?.cardmarket?.default ?? [])),
    ...Object.values(curated).flatMap((ids) => Object.values(ids)),
  ]);
  const products = [...cm.singles.values()]
    .filter((p) => p.idExpansion === expansion && !used.has(p.idProduct))
    .toSorted((a, b) => a.idProduct - b.idProduct);
  const assign = (cards: BuiltCard[], found: CardmarketProduct[]) =>
    cards
      .toSorted((a, b) => a.sort - b.sort)
      .forEach((card, i) => {
        const id = found[i]?.idProduct;
        if (!id) return;
        for (const variant of plainVariants(card))
          variant.refs = { ...variant.refs, cardmarket: { default: id } };
        finding.byName++;
        used.add(id);
      });
  const productsByBase = groupBy(products, (p) => productKey(p.name).base);
  for (const [base, cards] of groupBy(missing, (c) => cardKey(c).base)) {
    const candidates = productsByBase.get(base) ?? [];
    // Abilities and attacks first: two different Pikachu of one set differ there.
    const cardsByMoves = groupBy(cards, (c) => cardKey(c).moves);
    const productsByMoves = groupBy(candidates, (p) => productKey(p.name).moves);
    const byMoves = [...cardsByMoves].every(
      ([moves, list]) => productsByMoves.get(moves)?.length === list.length,
    );
    if (byMoves)
      for (const [moves, list] of cardsByMoves) assign(list, productsByMoves.get(moves) ?? []);
    else if (candidates.length === cards.length) assign(cards, candidates);
    else
      finding.unresolved.push(
        `${cards.map((c) => c.id).join(', ')} (${cards[0]?.name.en ?? base}): ${cards.length} cards vs ${candidates.length} products`,
      );
  }
  finding.unmatched = products.filter((p) => !used.has(p.idProduct));
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

/**
 * Curated ids win over TCGdex and the metacard or name match (both builds, so offline edits show
 * up). Asian cards: the first variant's product per language. International cards: one product
 * for DE and EN (given as either), for the card's plain variants.
 */
function applyCuratedCardmarket(sets: BuiltSet[], overlays: Map<string, Map<string, CardOverlay>>) {
  for (const set of sets) {
    const curated = curatedIds(set, overlays);
    for (const card of set.cards) {
      const ids = curated[card.id];
      if (!ids) continue;
      if (set.config.print === 'intl') {
        const id = ids.en ?? ids.de;
        for (const variant of plainVariants(card))
          if (id) variant.refs = { ...variant.refs, cardmarket: { default: id } };
        continue;
      }
      const variant = card.variants[0];
      if (!variant) continue;
      const byLanguage = { ...variant.refs?.cardmarket?.byLanguage, ...ids };
      variant.refs = { ...variant.refs, cardmarket: { byLanguage } };
    }
  }
}

/**
 * Offline builds keep the ids the last network build found where TCGdex has none: the Asian ids
 * sorted by language, the international ones matched by name (see applyCardmarket).
 */
export function carryOverCardmarket(
  sets: BuiltSet[],
  previous: PreviousCatalog,
  overlays: Map<string, Map<string, CardOverlay>>,
): void {
  for (const set of sets) {
    for (const card of set.cards) {
      const before = previous.cards.get(card.id);
      for (const variant of card.variants) {
        if (variant.refs?.cardmarket) continue;
        const cardmarket = before?.variants.find((v) => v.id === variant.id)?.refs?.cardmarket;
        if (cardmarket) variant.refs = { ...variant.refs, cardmarket };
      }
    }
  }
  applyCuratedCardmarket(sets, overlays);
}
