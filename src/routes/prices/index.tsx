import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { CatalogErrorPage } from '@/features/catalog';
import { PricesPage } from '@/features/prices';
import { m } from '@/i18n';

export const Route = createFileRoute('/prices/')({
  staticData: { title: m.nav_prices },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(manifestQuery),
  component: PricesPage,
  errorComponent: CatalogErrorPage,
});
