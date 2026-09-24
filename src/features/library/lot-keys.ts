import type { KeyboardEvent } from 'react';
import { openAdd, openLotPrice, type LibraryRow } from '@/features/collection';
import { remaining } from '@/domain/schemas';

/**
 * Keys on a focused lot (UX_SPEC.md §7): N adds another lot of its item, P records a price for the
 * series that values it. Custom items and lots whose item left the catalog can't take a new lot.
 */
export function lotKeys(row: LibraryRow) {
  return (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'n' && row.inCatalog) {
      event.preventDefault();
      openAdd(row.holding.item, row.setId, row.holding.language);
    } else if (key === 'p' && remaining(row.holding) > 0) {
      event.preventDefault();
      openLotPrice(row.holding);
    }
  };
}
