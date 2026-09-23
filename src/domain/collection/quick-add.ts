import type { CardSection, CatalogCard } from '../catalog';
import { CARD_SECTIONS } from '../catalog/vocab';

/**
 * Quick-add input (COL-06, UX_SPEC.md §4.8): a card number with optional modifiers.
 *
 *   25          one copy of card 25        4/102      the card printed as 4/102
 *   25x3        three copies (also ×3, *3) R          card R (e.g. the RGB Mews)
 *   25r         reverse holo (h = holo, n = normal)
 *   25 4,50     one copy bought for 4,50 € (a price is per copy)
 *
 * Modifiers may also stand on their own (`25 x3 r 4,50`). The price stays text here; the caller
 * parses it with the German money rules (i18n/format.ts).
 */

export const VARIANT_HINTS = { r: 'reverse', h: 'holo', n: 'normal' } as const;
export type VariantHint = (typeof VARIANT_HINTS)[keyof typeof VARIANT_HINTS];

export interface QuickAddCommand {
  number: string;
  quantity: number;
  variant?: VariantHint;
  priceText?: string;
}

export type QuickAddError = 'empty' | 'quantity' | 'unknown';
export type QuickAddParse =
  | { ok: true; command: QuickAddCommand }
  | { ok: false; error: QuickAddError; token?: string };

export const MAX_QUICK_QUANTITY = 999;

const QUANTITY = /^[x×*](\d+)$/i;
const TRAILING_QUANTITY = /^(.+?)[x×*](\d+)$/i;
const NUMBER_WITH_VARIANT = /^(\d+(?:\/\d+)?)([rhn])$/i;
const NUMBER = /^[\p{L}\p{N}]+(?:\/[\p{L}\p{N}]+)?$/u;
const PRICE = /^[\d.,]+€?$|^€[\d.,]+$/;

function variantOf(letter: string): VariantHint | undefined {
  const lower = letter.toLowerCase();
  return lower === 'r' || lower === 'h' || lower === 'n' ? VARIANT_HINTS[lower] : undefined;
}

export function parseQuickAdd(input: string): QuickAddParse {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const first = tokens.shift()?.replace(/^#/, '');
  if (!first) return { ok: false, error: 'empty' };

  let number = first;
  let quantity: number | undefined;
  let variant: VariantHint | undefined;
  let priceText: string | undefined;

  const withQuantity = TRAILING_QUANTITY.exec(number);
  if (withQuantity?.[1] && withQuantity[2] && !QUANTITY.test(number)) {
    number = withQuantity[1];
    quantity = Number(withQuantity[2]);
  }
  const withVariant = NUMBER_WITH_VARIANT.exec(number);
  if (withVariant?.[1] && withVariant[2]) {
    number = withVariant[1];
    variant = variantOf(withVariant[2]);
  }
  if (!NUMBER.test(number)) return { ok: false, error: 'unknown', token: first };

  for (const token of tokens) {
    const q = QUANTITY.exec(token);
    if (q?.[1] && quantity === undefined) {
      quantity = Number(q[1]);
    } else if (token.length === 1 && variantOf(token) && !variant) {
      variant = variantOf(token);
    } else if (PRICE.test(token) && priceText === undefined) {
      priceText = token;
    } else {
      return { ok: false, error: 'unknown', token };
    }
  }

  quantity ??= 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUICK_QUANTITY) {
    return { ok: false, error: 'quantity' };
  }
  const command: QuickAddCommand = { number, quantity };
  if (variant) command.variant = variant;
  if (priceText !== undefined) command.priceText = priceText;
  return { ok: true, command };
}

type NumberedCard = Pick<CatalogCard, 'id' | 'localId' | 'printedNumber' | 'section' | 'sort'>;

/** Leading zeros don't matter (`025` = `25`), nor does case (`r` = `R`). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .split('/')
    .map((part) => part.replace(/^0+(?=\p{N})/u, ''))
    .join('/');
}

/**
 * Cards matching a typed number, best first: the numbered main set before secret rares, subsets
 * and energies, and a printed number (`4/102`, as on the card) before an internal id. `section`
 * narrows the search, e.g. to the Klassische Sammlung, whose ids repeat the main set's numbers.
 */
export function findCardsByNumber<T extends NumberedCard>(
  cards: readonly T[],
  number: string,
  section?: CardSection,
): T[] {
  const wanted = normalize(number.replace(/^#/, '').trim());
  if (!wanted) return [];
  const withSlash = wanted.includes('/');
  const scored: { card: T; rank: number }[] = [];
  for (const card of cards) {
    if (section && card.section !== section) continue;
    const printed = normalize(card.printedNumber);
    const printedFirst = printed.split('/')[0] ?? '';
    let matchRank: number | undefined;
    if (withSlash) {
      if (printed === wanted) matchRank = 0;
    } else if (printed && printedFirst === wanted) {
      matchRank = 0;
    } else if (normalize(card.localId) === wanted) {
      matchRank = 1;
    }
    if (matchRank === undefined) continue;
    scored.push({ card, rank: CARD_SECTIONS.indexOf(card.section) * 2 + matchRank });
  }
  return scored
    .toSorted((a, b) => a.rank - b.rank || a.card.sort - b.card.sort)
    .map((entry) => entry.card);
}

type VariantCard = Pick<CatalogCard, 'variants'>;

/**
 * The variant to record: the hinted one (`reverse` also matches special reverse patterns), else
 * `preferred` when the card has it, else the card's first variant. Undefined when the hint
 * doesn't exist for this card.
 */
export function pickVariant(
  card: VariantCard,
  hint?: VariantHint,
  preferred?: string,
): string | undefined {
  const ids = card.variants.map((v) => v.id);
  if (hint) return ids.find((id) => id === hint) ?? ids.find((id) => id.startsWith(`${hint}-`));
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0];
}
