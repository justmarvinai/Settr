import { createFileRoute } from '@tanstack/react-router';
import { CollectionLayout } from '@/features/collection';
import { m } from '@/i18n';

export const Route = createFileRoute('/collection')({
  staticData: { title: m.nav_collection },
  component: CollectionLayout,
});
