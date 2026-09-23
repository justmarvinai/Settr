import { createFileRoute } from '@tanstack/react-router';
import { setsSearchSchema } from '@/catalog';
import { SetsPage } from '@/features/catalog';

export const Route = createFileRoute('/catalog/')({
  validateSearch: setsSearchSchema,
  component: SetsPage,
});
