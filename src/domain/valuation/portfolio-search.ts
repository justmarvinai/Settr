import { z } from 'zod';
import { cardLanguageSchema } from '../schemas/common';

/**
 * URL state of the Portfolio page (`/portfolio?kind=card&lang=de&by=set`): what it shows and how
 * it groups it. Apart from portfolio.ts, because the route tree validates it at startup (ADR-037).
 */
export const PORTFOLIO_KINDS = ['card', 'sealed'] as const;
export const ALLOCATION_VIEWS = ['category', 'set', 'language', 'rarity'] as const;
export type AllocationView = (typeof ALLOCATION_VIEWS)[number];
export const PERFORMANCE_VIEWS = ['set', 'language'] as const;
export type PerformanceView = (typeof PERFORMANCE_VIEWS)[number];

export const portfolioSearchSchema = z.object({
  kind: z.enum(PORTFOLIO_KINDS).optional().catch(undefined),
  lang: cardLanguageSchema.optional().catch(undefined),
  /** A set chunk (main set with its subsets). */
  set: z.string().min(1).optional().catch(undefined),
  by: z.enum(ALLOCATION_VIEWS).optional().catch(undefined),
  per: z.enum(PERFORMANCE_VIEWS).optional().catch(undefined),
});
export type PortfolioSearch = z.infer<typeof portfolioSearchSchema>;
