import { z } from '@/lib/zod';

/**
 * URL state of the price session (`/prices/session?start=stale&order=value`). Apart from
 * session.ts, because the route tree validates it at startup (ADR-037).
 */

export const SESSION_SCOPES = ['stale', 'unpriced', 'all', 'selection'] as const;
export type SessionScope = (typeof SESSION_SCOPES)[number];
export const SESSION_ORDERS = ['value', 'oldest', 'set'] as const;
export type SessionOrder = (typeof SESSION_ORDERS)[number];

export const priceSessionSearchSchema = z.object({
  /** Start a new session for this scope (replacing a paused one); without it, resume. */
  start: z.enum(SESSION_SCOPES).optional().catch(undefined),
  order: z.enum(SESSION_ORDERS).optional().catch(undefined),
});
export type PriceSessionSearch = z.infer<typeof priceSessionSearchSchema>;
