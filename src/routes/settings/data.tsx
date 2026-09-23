import { createFileRoute } from '@tanstack/react-router';
import { DataSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/data')({ component: DataSettings });
