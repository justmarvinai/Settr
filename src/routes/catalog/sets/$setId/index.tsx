import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { manifestQuery, setQuery, setSearchSchema } from '@/catalog';
import { pickText } from '@/domain/catalog';
import { SetPage } from '@/features/catalog';

export const Route = createFileRoute('/catalog/sets/$setId/')({
  validateSearch: setSearchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery);
    const summary = manifest.sets.find((s) => s.id === params.setId);
    if (!summary) throw notFound();
    // A subset (Klassische Sammlung) is a section of its main set's page.
    if (summary.parentSetId)
      throw redirect({
        to: '/catalog/sets/$setId',
        params: { setId: summary.parentSetId },
        search: { section: 'subset' },
        replace: true,
      });
    await queryClient.ensureQueryData(setQuery(manifest, params.setId));
    return { pageTitle: pickText(summary.name) };
  },
  component: SetPage,
});
