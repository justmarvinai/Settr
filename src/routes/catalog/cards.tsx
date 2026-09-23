import { createFileRoute } from '@tanstack/react-router';
import { cardsSearchSchema } from '@/catalog';
import { CardsPage } from '@/features/catalog';

export const Route = createFileRoute('/catalog/cards')({
  validateSearch: cardsSearchSchema,
  component: CardsPage,
});
