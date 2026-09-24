import { createFileRoute } from '@tanstack/react-router';
import { OnboardingPage } from '@/features/onboarding';
import { m } from '@/i18n';

export const Route = createFileRoute('/onboarding')({
  staticData: { title: m.onboarding_title },
  component: OnboardingPage,
});
