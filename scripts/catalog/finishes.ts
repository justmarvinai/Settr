import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CatalogCard } from '../../src/domain/catalog';
import type { RarityId } from '../../src/domain/catalog/vocab';
import type { SetConfig } from './config';
import { download } from './fetch';
import { dirs } from './paths';
import type { PreviousCatalog } from './previous';
import { readResults } from './tcgcsv';
import type { RawVariant } from './tcgdex';

/**
 * Finishes of cards TCGdex has no variants for (most Sun & Moon sets, ADR-057): which of normal,
 * holo and reverse holo a card was printed in. Network builds read TCGplayer's printings per card
 * number from TCGCSV (DATA_SOURCES.md §4); offline builds keep the last network build's; a
 * rarity rule covers cards neither knows.
 */
export type Finish = 'normal' | 'holo' | 'reverse';
export type FinishSource = 'tcgplayer' | 'previous' | 'rule';

/** Set id → card number (as TCGdex's local id, without leading zeros) → finishes. */
export type FinishTable = Map<string, Map<string, Finish[]>>;

const PRINTINGS: Record<string, Finish> = {
  Normal: 'normal',
  Holofoil: 'holo',
  'Reverse Holofoil': 'reverse',
};
const ORDER: readonly Finish[] = ['normal', 'holo', 'reverse'];

/** `1/149` → `1`, `001` → `1`, `SV1/SV94` → `SV1`: the number part, without leading zeros. */
export const numberKey = (value: string) =>
  (value.split('/')[0] ?? '')
    .trim()
    .replace(/^([A-Z]*)0+(?=\d)/i, '$1')
    .toUpperCase();

interface TcgcsvCard {
  productId: number;
  name: string;
  extendedData?: { name: string; value: string }[];
}

/**
 * One TCGplayer group's cards → finishes per card number. Several products can share a number
 * (a prerelease or cracked-ice print next to the regular card): the plain ones win, so a
 * promotional print doesn't add its finish to the set's card.
 */
export function finishesByNumber(
  products: readonly TcgcsvCard[],
  printings: readonly { productId: number; subTypeName: string }[],
): Map<string, Finish[]> {
  const subTypes = new Map<number, Set<string>>();
  for (const { productId, subTypeName } of printings)
    subTypes.set(productId, (subTypes.get(productId) ?? new Set()).add(subTypeName));
  const byNumber = new Map<string, TcgcsvCard[]>();
  for (const product of products) {
    const number = product.extendedData?.find((d) => d.name === 'Number')?.value;
    if (!number) continue;
    const key = numberKey(number);
    byNumber.set(key, [...(byNumber.get(key) ?? []), product]);
  }
  const out = new Map<string, Finish[]>();
  for (const [key, list] of byNumber) {
    const plain = list.filter((p) => !/\(.*\)/.test(p.name));
    const finishes = new Set<Finish>();
    for (const product of plain.length ? plain : list)
      for (const subType of subTypes.get(product.productId) ?? []) {
        const finish = PRINTINGS[subType];
        if (finish) finishes.add(finish);
      }
    if (finishes.size)
      out.set(
        key,
        ORDER.filter((f) => finishes.has(f)),
      );
  }
  return out;
}

/** TCGCSV products and prices (the printings) of the sets with a `tcgplayerGroup`. */
export async function loadFinishes(configs: readonly SetConfig[]): Promise<FinishTable> {
  mkdirSync(dirs.tcgcsv, { recursive: true });
  const table: FinishTable = new Map();
  for (const config of configs) {
    const group = config.tcgplayerGroup;
    if (!group) continue;
    const products = join(dirs.tcgcsv, `products-${group}.json`);
    const prices = join(dirs.tcgcsv, `prices-${group}.json`);
    await download(`https://tcgcsv.com/tcgplayer/3/${group}/products`, products);
    await download(`https://tcgcsv.com/tcgplayer/3/${group}/prices`, prices);
    table.set(config.id, finishesByNumber(readResults(products), readResults(prices)));
  }
  return table;
}

/** The finishes a previous build gave a card (its plain variants, deck and promo prints included). */
export function previousFinishes(card: CatalogCard | undefined): Finish[] | undefined {
  if (!card) return undefined;
  const finishes = new Set<Finish>();
  for (const { id } of card.variants) {
    if (id === 'normal' || id === 'normal+deck') finishes.add('normal');
    if (id === 'holo' || id === 'holo+promo') finishes.add('holo');
    if (id === 'reverse') finishes.add('reverse');
  }
  return finishes.size ? ORDER.filter((f) => finishes.has(f)) : undefined;
}

/**
 * The last resort: Commons, Uncommons and Rares come as non-holo and reverse holo, everything
 * rarer as a holo (before Scarlet & Violet; `rareIsHolo` sets move Rares to the holos).
 */
export function ruleFinishes(rarity: RarityId | undefined, rareIsHolo: boolean): Finish[] {
  const plain = rarity === 'common' || rarity === 'uncommon' || (rarity === 'rare' && !rareIsHolo);
  return plain ? ['normal', 'reverse'] : rarity === 'rare' ? ['holo', 'reverse'] : ['holo'];
}

/** Plain variants of these finishes (build.ts gives them the card's products). */
export const finishVariants = (finishes: readonly string[]): RawVariant[] =>
  finishes.map((type) => ({ type }));

export interface FinishLookup {
  /** TCGplayer's printings (network builds; empty offline or when TCGCSV is down). */
  table: FinishTable;
  previous: PreviousCatalog;
}

/**
 * A card's finishes when TCGdex lists none, with where they came from: TCGplayer, else the last
 * build (offline, or a card TCGplayer doesn't list), else the rarity rule.
 */
export function finishesOf(
  lookup: FinishLookup,
  config: SetConfig,
  cardId: string,
  localId: string,
  rarity: RarityId | undefined,
): { finishes: Finish[]; source: FinishSource } {
  const fromTcgplayer = lookup.table.get(config.id)?.get(numberKey(localId));
  if (fromTcgplayer) return { finishes: fromTcgplayer, source: 'tcgplayer' };
  const before = previousFinishes(lookup.previous.cards.get(cardId));
  if (before) return { finishes: before, source: 'previous' };
  return { finishes: ruleFinishes(rarity, config.rareIsHolo ?? true), source: 'rule' };
}
