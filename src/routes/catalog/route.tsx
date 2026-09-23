import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { CatalogErrorPage, CatalogLayout } from '@/features/catalog';
import { m } from '@/i18n';

export const Route = createFileRoute('/catalog')({
  staticData: { title: m.nav_catalog },
  loader: ({ context }) => context.queryClient.ensureQueryData(manifestQuery),
  component: CatalogLayout,
  errorComponent: CatalogErrorPage,
  // Defined here, not in the feature: pendingComponent isn't code-split, and importing it from
  // the feature would pull every catalog page into the entry chunk.
  pendingComponent: CatalogPending,
});

function CatalogPending() {
  return <output className="type-body m-0 block px-1 text-ink-muted">{m.catalog_loading()}</output>;
}
