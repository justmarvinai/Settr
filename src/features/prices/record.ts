import { addPrice, db, deletePrice } from '@/db';
import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import { money } from '@/domain/money';
import type { ItemSnapshot, PriceEntry, PriceType, Settings } from '@/domain/schemas';
import type { GradeKey } from '@/domain/series';
import { toastWithUndo } from '@/features/collection';
import { languageCode, m } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import { parseMoneyInput } from '@/i18n/money-input';
import { contextOf, sourceOf } from './series';

/** A card or sealed product as the price views need it. */
export interface PricedItem {
  ref: ItemRef;
  /** Display snapshot stored with every entry (rule 4: records survive catalog changes). */
  snapshot: ItemSnapshot;
  /** Names the item in toasts, e.g. `025 Pikachu-ex`. */
  label: string;
  languages: readonly CardLanguage[];
  /** Card variants; empty for sealed products. */
  variants: readonly { id: string; label: string }[];
}

/** The series a new price belongs to (DATA_MODEL.md §6.1). */
export interface SeriesTarget {
  item: PricedItem;
  language: CardLanguage;
  variant: string;
  grade: GradeKey;
  seriesKey: string;
}

export function amountError(text: string): string | undefined {
  if (!text.trim()) return m.error_price_required();
  const parsed = parseMoneyInput(text);
  if (parsed.ok) return undefined;
  return parsed.error === 'too-many-decimals' ? m.error_price_decimals() : m.error_price_invalid();
}

export function dateError(date: string, today: string): string | undefined {
  if (!date) return m.error_date_required();
  return date > today ? m.error_date_future() : undefined;
}

/**
 * Records one price (PRC-01) with how it was looked up (R2.2) and offers undo. `like` is the entry
 * a price is confirmed from ("Unverändert"): its type, source and context carry over.
 */
export async function savePrice(
  target: SeriesTarget,
  settings: Settings,
  input: {
    minor: number;
    date: string;
    type: PriceType;
    note?: string | undefined;
    like?: PriceEntry | undefined;
  },
): Promise<PriceEntry> {
  const { item, language } = target;
  const context = input.like ? input.like.context : contextOf(input.type, settings, language);
  const note = input.note?.trim();
  const entry = await addPrice(db, {
    seriesKey: target.seriesKey,
    item: item.ref,
    language,
    ...(item.ref.kind === 'card' ? { variant: target.variant } : {}),
    grade: target.grade,
    snapshot: item.snapshot,
    date: input.date,
    price: money(input.minor),
    priceType: input.type,
    source: input.like?.source ?? sourceOf(input.type),
    ...(context ? { context } : {}),
    origin: 'manual',
    ...(note ? { note } : {}),
  });
  toastWithUndo(
    m.prices_saved({
      amount: formatMoney(entry.price),
      what: `${item.label} · ${languageCode(language)}`,
    }),
    () => deletePrice(db, entry.id),
  );
  return entry;
}
