import { createFileRoute } from '@tanstack/react-router';
import { SettingsLayout } from '@/features/settings';
import { m } from '@/i18n';

export const Route = createFileRoute('/settings')({
  staticData: { title: m.nav_settings },
  component: SettingsLayout,
});
