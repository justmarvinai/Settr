import type { CardLanguage } from '../catalog-types';
import type { CatalogCard, VariantDef } from '../catalog/schema';
import type { Holding } from '../schemas/holding';
import { isOpen } from '../schemas/holding';

/**
 * Set completion (DATA_MODEL.md §6.6, Q5.5), counted over one set chunk: the main set with its
 * subsets and energies.
 * - Basis: distinct cards of the numbered main set (section `main`).
 * - Komplett: distinct cards of the main set incl. secret rares (`main` + `secret`).
 * - Master: (card, variant) pairs of everything in the chunk (+ subsets and energies), without
 *   promotional variants (kind `stamp`). A card that only exists in promotional variants (an MEP
 *   promo in Cosmos-Holo) counts with its first one, so Master never counts fewer cards.
 * With a language, only copies in that language count, and only cards that exist in it are due.
 */

export const COMPLETION_METRICS = ['basis', 'komplett', 'master'] as const;
export type CompletionMetric = (typeof COMPLETION_METRICS)[number];

export interface Progress {
  owned: number;
  total: number;
}

export type SetCompletion = Record<CompletionMetric, Progress>;

type CompletionCard = Pick<CatalogCard, 'id' | 'section' | 'languages' | 'variants'>;
type CompletionHolding = Pick<
  Holding,
  'item' | 'language' | 'variant' | 'grading' | 'quantity' | 'disposals'
>;

export interface CompletionOptions {
  /** A card language, or undefined for "any language". */
  language?: CardLanguage | undefined;
  /** Whether graded copies count as owned (default: yes, DATA_MODEL.md §6.6). */
  includeGraded?: boolean;
  /** Variant kinds by id (the set chunk's legend); stamped variants don't count towards Master. */
  variantsLegend?: readonly Pick<VariantDef, 'id' | 'kind'>[];
}

const BASIS = new Set<CatalogCard['section']>(['main']);
const KOMPLETT = new Set<CatalogCard['section']>(['main', 'secret']);
const MASTER = new Set<CatalogCard['section']>(['main', 'secret', 'subset', 'energy']);

const pairKey = (cardId: string, variant: string) => `${cardId}\u0000${variant}`;

/** Card ids and (card, variant) pairs owned in the language (or any language). */
export function ownedKeys(
  holdings: readonly CompletionHolding[],
  { language, includeGraded = true }: Pick<CompletionOptions, 'language' | 'includeGraded'> = {},
): { cards: Set<string>; pairs: Set<string>; unvaried: Set<string> } {
  const cards = new Set<string>();
  const pairs = new Set<string>();
  /** Cards held without a variant (e.g. imported); they count for single-variant cards. */
  const unvaried = new Set<string>();
  for (const h of holdings) {
    if (h.item.kind !== 'card' || !isOpen(h)) continue;
    if (language && h.language !== language) continue;
    if (!includeGraded && h.grading) continue;
    cards.add(h.item.id);
    if (h.variant) pairs.add(pairKey(h.item.id, h.variant));
    else unvaried.add(h.item.id);
  }
  return { cards, pairs, unvaried };
}

function availableIn(
  entry: { languages?: readonly CardLanguage[] | undefined },
  language: CardLanguage | undefined,
): boolean {
  return !language || !entry.languages || entry.languages.includes(language);
}

export function setCompletion(
  cards: readonly CompletionCard[],
  holdings: readonly CompletionHolding[],
  options: CompletionOptions = {},
): SetCompletion {
  const { language } = options;
  const owned = ownedKeys(holdings, options);
  const stamped = new Set(
    (options.variantsLegend ?? []).filter((v) => v.kind === 'stamp').map((v) => v.id),
  );
  const result: SetCompletion = {
    basis: { owned: 0, total: 0 },
    komplett: { owned: 0, total: 0 },
    master: { owned: 0, total: 0 },
  };
  for (const card of cards) {
    if (!availableIn(card, language)) continue;
    const has = owned.cards.has(card.id);
    if (BASIS.has(card.section)) {
      result.basis.total += 1;
      if (has) result.basis.owned += 1;
    }
    if (KOMPLETT.has(card.section)) {
      result.komplett.total += 1;
      if (has) result.komplett.owned += 1;
    }
    if (MASTER.has(card.section)) {
      const regular = card.variants.filter((v) => !stamped.has(v.id));
      for (const variant of regular.length ? regular : card.variants.slice(0, 1)) {
        if (!availableIn(variant, language)) continue;
        result.master.total += 1;
        const held =
          owned.pairs.has(pairKey(card.id, variant.id)) ||
          (card.variants.length === 1 && owned.unvaried.has(card.id));
        if (held) result.master.owned += 1;
      }
    }
  }
  return result;
}

/** Share owned, 0…1 (0 for an empty denominator). */
export function ratio({ owned, total }: Progress): number {
  return total === 0 ? 0 : owned / total;
}

export interface OwnedCard {
  /** Copies held (open lots, all languages unless filtered). */
  count: number;
  languages: Set<CardLanguage>;
  variants: Set<string>;
}

/** Per card: how many copies are held, and in which languages and variants (set grid badges). */
export function ownedByCard(
  holdings: readonly CompletionHolding[],
  language?: CardLanguage,
): Map<string, OwnedCard> {
  const byCard = new Map<string, OwnedCard>();
  for (const h of holdings) {
    if (h.item.kind !== 'card' || !isOpen(h)) continue;
    if (language && h.language !== language) continue;
    const entry = byCard.get(h.item.id) ?? { count: 0, languages: new Set(), variants: new Set() };
    entry.count += h.quantity - h.disposals.reduce((n, d) => n + d.quantity, 0);
    entry.languages.add(h.language);
    if (h.variant) entry.variants.add(h.variant);
    byCard.set(h.item.id, entry);
  }
  return byCard;
}
