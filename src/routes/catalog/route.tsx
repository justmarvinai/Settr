import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { CatalogErrorPage, CatalogLayout, CatalogPending } from '@/features/catalog';
import { m } from '@/i18n';

export const Route = createFileRoute('/catalog')({
  staticData: { title: m.nav_catalog },
  loader: ({ context }) => context.queryClient.ensureQueryData(manifestQuery),
  component: CatalogLayout,
  pendingComponent: CatalogPending,
  errorComponent: CatalogErrorPage,
});
