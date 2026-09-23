import { createFileRoute } from '@tanstack/react-router';
import { AboutSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/about')({ component: AboutSettings });
