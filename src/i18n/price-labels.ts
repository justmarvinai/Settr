/**
 * German labels for prices (I18N.md §6.5). Apart from labels.ts, which the app shell loads at
 * startup, so they ship with the price views.
 */
import type { PriceEntry, PriceType } from '@/domain/schemas';
import { lookup } from './labels';
import { m } from './paraglide/messages.js';

/** Cardmarket's price types as German Cardmarket labels them; `from` is Settr's default. */
export const priceTypeLabel = /* @__PURE__ */ lookup<PriceType>({
  from: m.price_type_from,
  trend: m.price_type_trend,
  avg30: m.price_type_avg30,
  avg7: m.price_type_avg7,
  avg1: m.price_type_avg1,
  sold: m.price_type_sold,
  manual: m.price_type_manual,
});

const GUIDE_TYPES: Partial<Record<PriceType, () => string>> = {
  from: m.price_type_guide_from,
  trend: m.price_type_guide_trend,
};

/** An entry's type as lists show it: accepted price-guide values say so (PRC-09). */
export function entryTypeLabel(entry: Pick<PriceEntry, 'priceType' | 'origin'>): string {
  const guide = entry.origin === 'guide' ? GUIDE_TYPES[entry.priceType] : undefined;
  return guide ? guide() : priceTypeLabel(entry.priceType);
}
