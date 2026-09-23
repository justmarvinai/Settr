import { createFileRoute, notFound } from '@tanstack/react-router';
import { manifestQuery, productSearchSchema, sealedQuery } from '@/catalog';
import { pickText } from '@/domain/catalog';
import { ProductPage } from '@/features/catalog';

export const Route = createFileRoute('/catalog/sealed/$productId')({
  validateSearch: productSearchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    const manifest = await queryClient.ensureQueryData(manifestQuery);
    const { byId } = await queryClient.ensureQueryData(sealedQuery(manifest));
    const product = byId.get(params.productId);
    if (!product) throw notFound();
    return { pageTitle: pickText(product.name) };
  },
  component: ProductPage,
});
