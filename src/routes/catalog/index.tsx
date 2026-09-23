import { createFileRoute } from '@tanstack/react-router';
import { SetsPage, setsSearchSchema } from '@/features/catalog';

export const Route = createFileRoute('/catalog/')({
  validateSearch: setsSearchSchema,
  component: SetsPage,
});
