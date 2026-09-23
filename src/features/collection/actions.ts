import type { CardLanguage, ItemRef } from '@/domain/catalog-types';
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

export function openQuickAdd(setId: string, language?: CardLanguage): void {
  openSheet({ type: 'quick', setId, language });
}
