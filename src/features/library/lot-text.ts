import { STANDARD_VARIANT } from '@/domain/catalog';
import { remaining, type Holding } from '@/domain/schemas';
import { m } from '@/i18n';
import { gradingText, sealedStateLabel } from '@/i18n/collection-labels';
import { formatCount } from '@/i18n/format';
import { lotLabel } from '@/features/collection';
import type { LibraryRow } from './rows';

/** `×2`, `1 von 3` after a partial sale, or `Abgeschlossen`. */
export function quantityText(h: Holding): string {
  const left = remaining(h);
  if (left <= 0) return m.lot_closed();
  return left === h.quantity
    ? m.count_times({ count: formatCount(left) })
    : m.lot_remaining({ remaining: formatCount(left), quantity: formatCount(h.quantity) });
}

/** The variant's name, unless it's the standard print (which most cards only have). */
export function variantText(row: LibraryRow): string | undefined {
  const variant = row.holding.variant;
  return variant && variant !== STANDARD_VARIANT ? row.variantLabel : undefined;
}

/** `NM`, `PSA 10` or `Versiegelt`. */
export function stateText(h: Holding): string | undefined {
  if (h.item.kind === 'sealed') return sealedStateLabel(h.sealedState ?? 'sealed');
  return h.grading ? gradingText(h.grading) : h.condition;
}

/** `150/128 Pikachu-ex · DE · NM` for toasts, menus and screen readers. */
export function describeRow(row: LibraryRow): string {
  const h = row.holding;
  return lotLabel(row.info, {
    language: h.language,
    condition: h.grading ? gradingText(h.grading) : h.condition,
    quantity: Math.max(remaining(h), 1),
  });
}
