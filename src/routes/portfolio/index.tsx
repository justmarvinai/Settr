import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { portfolioSearchSchema } from '@/domain/valuation/portfolio-search';
import { CatalogErrorPage } from '@/features/catalog';
import { PortfolioPage } from '@/features/portfolio';
import { m } from '@/i18n';

export const Route = createFileRoute('/portfolio/')({
  staticData: { title: m.nav_portfolio },
  validateSearch: portfolioSearchSchema,
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(manifestQuery),
  component: PortfolioPage,
  errorComponent: CatalogErrorPage,
});
