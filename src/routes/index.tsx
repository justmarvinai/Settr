import { createFileRoute, redirect } from '@tanstack/react-router';
import { OverviewPage } from '@/features/overview';
import { m } from '@/i18n';
import { isOnboarded } from '@/lib/onboarded';

export const Route = createFileRoute('/')({
  staticData: { title: m.nav_overview },
  // First run on this device (APP-06): the three-step welcome instead of an empty Übersicht. The
  // flag is checked first, so the onboarding only loads on a device that may need it.
  beforeLoad: async () => {
    if (isOnboarded()) return;
    const { needsOnboarding } = await import('@/features/onboarding');
    if (await needsOnboarding()) throw redirect({ to: '/onboarding', replace: true });
  },
  component: OverviewPage,
});
