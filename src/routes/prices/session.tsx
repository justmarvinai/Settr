import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { priceSessionSearchSchema } from '@/domain/valuation/session-search';
import { CatalogErrorPage } from '@/features/catalog';
import { PriceSessionPage } from '@/features/prices';
import { m } from '@/i18n';

export const Route = createFileRoute('/prices/session')({
  staticData: { title: m.session_title },
  validateSearch: priceSessionSearchSchema,
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(manifestQuery),
  component: PriceSessionPage,
  errorComponent: CatalogErrorPage,
});
