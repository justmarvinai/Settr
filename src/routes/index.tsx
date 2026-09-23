import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/features/overview';
import { m } from '@/i18n';

export const Route = createFileRoute('/')({
  staticData: { title: m.nav_overview },
  component: OverviewPage,
});
