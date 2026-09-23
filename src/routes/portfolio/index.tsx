import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { m } from '@/i18n';

export const Route = createFileRoute('/portfolio/')({
  staticData: { title: m.nav_portfolio },
  component: PortfolioPage,
});

function PortfolioPage() {
  return <ComingSoon badge={m.page_coming_title()} body={m.page_coming_portfolio()} />;
}
