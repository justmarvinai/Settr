import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildProblems, BuiltSet } from './build';
import type { CuratedProduct } from './curated';
import { dirs } from './paths';

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
  simplifiedChinese: { mapped: number; unresolved: string[] };
  /** Sealed products listed for the configured expansions, to curate `refs.cardmarket`. */
  sealedCandidates: CardmarketProduct[];
}

/**
 * Checks every card's Cardmarket id against the product file and adds Simplified Chinese product
 * ids for Asian cards via `idMetacard` (JP expansion ↔ SC expansion, DATA_SOURCES.md §6.2).
 * Several prints of one card share a metacard (30 Pikachus), so those pair in number order, and
 * only when both sides have the same count.
 */
export function applyCardmarket(
  sets: BuiltSet[],
  cm: CardmarketIndex,
  products: CuratedProduct[],
  problems: BuildProblems,
): CardmarketReport {
  const report: CardmarketReport = {
    checked: 0,
    simplifiedChinese: { mapped: 0, unresolved: [] },
    sealedCandidates: [],
  };
  const expansions = new Set<number>();
  for (const set of sets) {
    const expected = set.config.cardmarket;
    if (!expected) continue;
    expansions.add(expected.expansion);
    if (expected.simplifiedChineseExpansion) expansions.add(expected.simplifiedChineseExpansion);
    for (const card of set.cards) {
      const refs = card.variants[0]?.refs?.cardmarket;
      const id = refs?.default ?? refs?.byLanguage?.ja;
      if (!id) continue;
      report.checked++;
      const product = cm.singles.get(id);
      if (!product)
        problems.warnings.push(
          `${card.id}: Cardmarket product ${id} not in products_singles_6.json`,
        );
      else if (product.idExpansion !== expected.expansion && card.section !== 'energy') {
        problems.warnings.push(
          `${card.id}: Cardmarket product ${id} is in expansion ${product.idExpansion}, expected ${expected.expansion}`,
        );
      }
    }

    const scExpansion = expected.simplifiedChineseExpansion;
    if (!scExpansion) continue;
    const scByMetacard = new Map<number, number[]>();
    for (const p of cm.singles.values()) {
      if (p.idExpansion === scExpansion && p.idMetacard)
        scByMetacard.set(p.idMetacard, [...(scByMetacard.get(p.idMetacard) ?? []), p.idProduct]);
    }
    const jpByMetacard = new Map<number, typeof set.cards>();
    for (const card of set.cards) {
      const ja = card.variants[0]?.refs?.cardmarket?.byLanguage?.ja;
      const metacard = ja ? cm.singles.get(ja)?.idMetacard : undefined;
      if (metacard) jpByMetacard.set(metacard, [...(jpByMetacard.get(metacard) ?? []), card]);
      else report.simplifiedChinese.unresolved.push(`${card.id} (no JP product/metacard)`);
    }
    for (const [metacard, cards] of jpByMetacard) {
      const sc = (scByMetacard.get(metacard) ?? []).toSorted((a, b) => a - b);
      if (sc.length !== cards.length) {
        report.simplifiedChinese.unresolved.push(
          `${cards.map((c) => c.id).join(', ')}: ${cards.length} JP vs ${sc.length} SC products`,
        );
        continue;
      }
      cards
        .toSorted((a, b) => a.sort - b.sort)
        .forEach((card, i) => {
          const variant = card.variants[0];
          const cardmarket = variant?.refs?.cardmarket;
          if (cardmarket)
            cardmarket.byLanguage = { ...cardmarket.byLanguage, 'zh-cn': sc[i] as number };
          report.simplifiedChinese.mapped++;
        });
    }
  }

  for (const product of products) {
    const id = product.refs?.cardmarket;
    if (!id) continue;
    const found = cm.nonsingles.get(id);
    if (!found)
      problems.errors.push(
        `${product.id}: Cardmarket product ${id} not in products_nonsingles_6.json`,
      );
    else if (!expansions.has(found.idExpansion))
      problems.warnings.push(
        `${product.id}: Cardmarket product ${id} is in expansion ${found.idExpansion}`,
      );
  }
  report.sealedCandidates = [...cm.nonsingles.values()].filter(
    (p) => expansions.has(p.idExpansion) || p.idExpansion === 6628,
  );
  return report;
}
