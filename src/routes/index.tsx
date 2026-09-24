import { createFileRoute, redirect } from '@tanstack/react-router';
import { needsOnboarding } from '@/features/onboarding';
import { OverviewPage } from '@/features/overview';
import { m } from '@/i18n';

export const Route = createFileRoute('/')({
  staticData: { title: m.nav_overview },
  // First run on this device (APP-06): the three-step welcome instead of an empty Übersicht.
  beforeLoad: async () => {
    if (await needsOnboarding()) throw redirect({ to: '/onboarding', replace: true });
  },
  component: OverviewPage,
});
