import { getRouteApi } from '@tanstack/react-router';
import { LibraryPage } from './LibraryPage';

const cardsRoute = /* @__PURE__ */ getRouteApi('/collection/cards');
const sealedRoute = /* @__PURE__ */ getRouteApi('/collection/sealed');

/** Sammlung › Karten (COL-04). */
export function CollectionCardsPage() {
  const search = cardsRoute.useSearch();
  const navigate = cardsRoute.useNavigate();
  return (
    <LibraryPage
      kind="card"
      search={search}
      onSearchChange={(patch) =>
        void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
      }
    />
  );
}

/** Sammlung › Sealed (COL-05). */
export function CollectionSealedPage() {
  const search = sealedRoute.useSearch();
  const navigate = sealedRoute.useNavigate();
  return (
    <LibraryPage
      kind="sealed"
      search={search}
      onSearchChange={(patch) =>
        void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
      }
    />
  );
}
