import { createFileRoute } from '@tanstack/react-router';
import { LocationSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/locations')({ component: LocationSettings });
