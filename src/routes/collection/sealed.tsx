import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery } from '@/catalog';
import { collectionSearchSchema } from '@/domain/collection/search';
import { CatalogErrorPage } from '@/features/catalog';
import { CollectionSealedPage } from '@/features/library';

export const Route = createFileRoute('/collection/sealed')({
  validateSearch: collectionSearchSchema,
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(manifestQuery),
  component: CollectionSealedPage,
  errorComponent: CatalogErrorPage,
});
