import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { m } from '@/i18n';

export const Route = createFileRoute('/collection/sealed')({ component: CollectionSealedPage });

function CollectionSealedPage() {
  return <ComingSoon badge={m.page_coming_title()} body={m.page_coming_collection()} />;
}
