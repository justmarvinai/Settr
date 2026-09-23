/**
 * German labels for prices (I18N.md §6.5). Apart from labels.ts, which the app shell loads at
 * startup, so they ship with the price views.
 */
import type { PriceType } from '@/domain/schemas';
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
