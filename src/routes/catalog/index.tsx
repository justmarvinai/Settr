import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { m } from '@/i18n';

export const Route = createFileRoute('/catalog/')({
  staticData: { title: m.nav_catalog },
  component: CatalogPage,
});

function CatalogPage() {
  return <ComingSoon badge={m.page_coming_title()} body={m.page_coming_catalog()} />;
}
