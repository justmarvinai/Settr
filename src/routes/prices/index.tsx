import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { m } from '@/i18n';

export const Route = createFileRoute('/prices/')({
  staticData: { title: m.nav_prices },
  component: PricesPage,
});

function PricesPage() {
  return <ComingSoon badge={m.page_coming_title()} body={m.page_coming_prices()} />;
}
