import { createFileRoute, notFound } from '@tanstack/react-router';
import { manifestQuery, setQuery } from '@/catalog';
import { pickText } from '@/domain/catalog';
import { CardPage, cardSearchSchema } from '@/features/catalog';

export const Route = createFileRoute('/catalog/sets/$setId/cards/$cardId')({
  validateSearch: cardSearchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery);
    if (!manifest.sets.some((s) => s.id === params.setId)) throw notFound();
    const loaded = await queryClient.ensureQueryData(setQuery(manifest, params.setId));
    const card = loaded.byId.get(params.cardId);
    if (!card) throw notFound();
    return { pageTitle: `${pickText(card.name)} · ${card.printedNumber || card.localId}` };
  },
  component: CardPage,
});
