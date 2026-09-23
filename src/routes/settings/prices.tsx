import { createFileRoute } from '@tanstack/react-router';
import { PriceSettings } from '@/features/settings';

export const Route = createFileRoute('/settings/prices')({ component: PriceSettings });
