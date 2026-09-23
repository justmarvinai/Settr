import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { m } from '@/i18n';

// Replaced by the catalog card search (CAT-04) in this milestone.
export const Route = createFileRoute('/catalog/cards')({
  component: () => <ComingSoon badge={m.page_coming_title()} body={m.search_coming()} />,
});
