import { createFileRoute } from '@tanstack/react-router';
import { GeneralSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/')({ component: GeneralSettings });
