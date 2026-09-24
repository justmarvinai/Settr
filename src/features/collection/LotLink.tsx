import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { LibraryRow } from './rows';

/** Where a lot's item page is: its card (in its set) or its product; none for custom items. */
export function LotLink({
  row,
  children,
  className,
}: {
  row: LibraryRow;
  children: ReactNode;
  className?: string;
}) {
  const h = row.holding;
  if (h.item.kind === 'card' && row.pageSetId) {
    return (
      <Link
        to="/catalog/sets/$setId/cards/$cardId"
        params={{ setId: row.pageSetId, cardId: h.item.id }}
        search={{ lang: h.language }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  if (h.item.kind === 'sealed' && row.inCatalog && !row.info.custom) {
    return (
      <Link
        to="/catalog/sealed/$productId"
        params={{ productId: h.item.id }}
        search={{ lang: h.language }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}
