import { createFileRoute } from '@tanstack/react-router';
import { manifestQuery, sealedQuery, sealedSearchSchema } from '@/catalog';
import { SealedPage } from '@/features/catalog';

export const Route = createFileRoute('/catalog/sealed/')({
  validateSearch: sealedSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery);
    await queryClient.ensureQueryData(sealedQuery(manifest));
  },
  component: SealedPage,
});
