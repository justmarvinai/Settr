import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
import type { Holding } from '@/domain/schemas';
import { gradeKey } from '@/domain/series';
import { openSheet } from '@/lib/sheets';

/**
 * Entry points to the collection's sheets for other features (card pages, the set grid), kept
 * apart from the sheets themselves so importing them doesn't pull in the forms.
 */
export function openAdd(item: ItemRef, setId?: string, language?: CardLanguage): void {
  openSheet({ type: 'add', item, setId, language });
}

export function openEdit(holdingId: string): void {
  openSheet({ type: 'edit', holdingId });
}

export function openDispose(holdingId: string): void {
  openSheet({ type: 'dispose', holdingId });
}

export function openOpening(holdingId: string): void {
  openSheet({ type: 'open', holdingId });
}

export function openValue(holdingId: string): void {
  openSheet({ type: 'value', holdingId });
}

/** Record a price for an item in one language (UX_SPEC.md §4.9), e.g. with `P` on a set tile. */
export function openPrice(item: ItemRef, setId: string | undefined, language: CardLanguage): void {
  openSheet({ type: 'price', item, setId, language });
}

/** Record a price for the series that values a lot: its language, variant and grade. */
export function openLotPrice(holding: Holding): void {
  openSheet({
    type: 'price',
    item: holding.item,
    setId: holding.setId,
    language: holding.language,
    variant: holding.variant,
    grade: gradeKey(holding.grading),
    holdingId: holding.id,
  });
}

export function openQuickAdd(setId: string, language?: CardLanguage): void {
  openSheet({ type: 'quick', setId, language });
}
