import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { collectionSearchSchema } from '@/domain/collection/search';
import { CatalogErrorPage } from '@/features/catalog';
import { CollectionCardsPage } from '@/features/library';

export const Route = createFileRoute('/collection/cards')({
  validateSearch: collectionSearchSchema,
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(manifestQuery),
  component: CollectionCardsPage,
  errorComponent: CatalogErrorPage,
});
