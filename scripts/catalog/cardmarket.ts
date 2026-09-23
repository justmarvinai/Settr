import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CardLanguage } from '../../src/domain/catalog-types';
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

export interface CardmarketReport {
  checked: number;
  /** Singles per configured expansion, to spot an expansion Cardmarket hasn't filled yet. */
  singlesPerExpansion: Record<number, number>;
  /** Asian prints: ids found per card language, and cards left without one. */
  asia: { ja: number; 'zh-cn': number; unresolved: string[] };
  /** Singles of the Asian expansions that no card points to, to curate `cardmarket` overlays. */
  unmatchedSingles: CardmarketProduct[];
  /** Sealed products listed for the configured expansions, to curate `refs.cardmarket`. */
  sealedCandidates: CardmarketProduct[];
}

type AsianLanguage = 'ja' | 'zh-cn';

/**
 * Checks every card's Cardmarket id against the product file and sorts the Asian ids into
 * `byLanguage` (DATA_SOURCES.md §6.2). TCGdex keeps one id per Asian card, and for M6a it points
 * at the Simplified Chinese product, so the expansion decides the language and the other one is
 * found through `idMetacard`. Several prints of one card share a metacard (30 Pikachus), so those
 * pair in number order, and only when both sides have the same count.
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
    unmatchedSingles: [],
    sealedCandidates: [],
  };
  const expansions = new Set<number>();
  const sealedExpansions = new Set<number>();
  for (const set of sets) {
    const expected = set.config.cardmarket;
    if (!expected) continue;
    expansions.add(expected.expansion);
    if (expected.simplifiedChineseExpansion) expansions.add(expected.simplifiedChineseExpansion);
    for (const id of expected.sealedExpansions ?? []) sealedExpansions.add(id);
  }
  const sealedIn = (expansion: number) =>
    expansions.has(expansion) || sealedExpansions.has(expansion);
  for (const p of cm.singles.values())
    if (expansions.has(p.idExpansion))
      report.singlesPerExpansion[p.idExpansion] =
        (report.singlesPerExpansion[p.idExpansion] ?? 0) + 1;

  for (const set of sets) {
    const expected = set.config.cardmarket;
    if (!expected) continue;
    if (set.config.print === 'intl') {
      for (const card of set.cards) {
        const id = card.variants[0]?.refs?.cardmarket?.default;
        if (!id) continue;
        report.checked++;
        const product = cm.singles.get(id);
        if (!product)
          problems.warnings.push(
            `${card.id}: Cardmarket product ${id} not in products_singles_6.json`,
          );
        else if (product.idExpansion !== expected.expansion && card.section !== 'energy')
          problems.warnings.push(
            `${card.id}: Cardmarket product ${id} is in expansion ${product.idExpansion}, expected ${expected.expansion}`,
          );
      }
      continue;
    }

    const expansionOf: Record<AsianLanguage, number | undefined> = {
      ja: expected.expansion,
      'zh-cn': expected.simplifiedChineseExpansion,
    };
    const byMetacard = (expansion: number | undefined) => {
      const map = new Map<number, number[]>();
      for (const p of cm.singles.values())
        if (p.idExpansion === expansion && p.idMetacard)
          map.set(p.idMetacard, [...(map.get(p.idMetacard) ?? []), p.idProduct]);
      return map;
    };
    const catalog = { ja: byMetacard(expansionOf.ja), 'zh-cn': byMetacard(expansionOf['zh-cn']) };
    const found = new Map<BuiltCard, Partial<Record<AsianLanguage, number>>>();
    // Cards whose known product shares a metacard, per language of that product.
    const groups = new Map<
      string,
      { known: AsianLanguage; metacard: number; cards: BuiltCard[] }
    >();
    for (const card of set.cards) {
      const id = card.source.cardmarket;
      if (!id) {
        report.asia.unresolved.push(`${card.id}: no Cardmarket id in TCGdex`);
        continue;
      }
      report.checked++;
      const product = cm.singles.get(id);
      const known = (['ja', 'zh-cn'] as const).find((l) => expansionOf[l] === product?.idExpansion);
      if (!product || !known) {
        problems.warnings.push(
          product
            ? `${card.id}: Cardmarket product ${id} is in expansion ${product.idExpansion}, expected ${expected.expansion} or ${expected.simplifiedChineseExpansion}`
            : `${card.id}: Cardmarket product ${id} not in products_singles_6.json`,
        );
        continue;
      }
      found.set(card, { [known]: id });
      if (!product.idMetacard) continue;
      const key = `${known}:${product.idMetacard}`;
      const group = groups.get(key) ?? { known, metacard: product.idMetacard, cards: [] };
      group.cards.push(card);
      groups.set(key, group);
    }
    for (const { known, metacard, cards } of groups.values()) {
      const other: AsianLanguage = known === 'ja' ? 'zh-cn' : 'ja';
      if (!expansionOf[other]) continue;
      const candidates = (catalog[other].get(metacard) ?? []).toSorted((a, b) => a - b);
      if (candidates.length !== cards.length) {
        report.asia.unresolved.push(
          `${cards.map((c) => c.id).join(', ')}: ${cards.length} ${known} vs ${candidates.length} ${other} products`,
        );
        continue;
      }
      cards
        .toSorted((a, b) => a.sort - b.sort)
        .forEach((card, i) => {
          const ids = found.get(card);
          if (ids) ids[other] = candidates[i];
        });
    }
    const used = new Set<number>();
    for (const [card, byLanguage] of found) {
      const variant = card.variants[0];
      if (!variant) continue;
      variant.refs = { ...variant.refs, cardmarket: { byLanguage } };
      for (const id of Object.values(byLanguage)) used.add(id);
    }
    for (const id of Object.values(curatedIds(set, overlays)).flatMap((ids) => Object.values(ids)))
      used.add(id);
    report.unmatchedSingles.push(
      ...[...cm.singles.values()].filter(
        (p) =>
          (p.idExpansion === expansionOf.ja || p.idExpansion === expansionOf['zh-cn']) &&
          !used.has(p.idProduct),
      ),
    );
  }
  applyCuratedCardmarket(sets, overlays);
  for (const card of sets.filter((s) => s.config.print === 'asia').flatMap((s) => s.cards)) {
    const byLanguage = card.variants[0]?.refs?.cardmarket?.byLanguage;
    if (byLanguage?.ja) report.asia.ja++;
    if (byLanguage?.['zh-cn']) report.asia['zh-cn']++;
  }

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

/** Curated `cardmarket` overlays of a set: card id → product per language. */
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
