import { createFileRoute } from '@tanstack/react-router';
import { AppearanceSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/appearance')({ component: AppearanceSettings });
