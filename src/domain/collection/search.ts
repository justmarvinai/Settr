import { z } from 'zod';
import { CARD_LANGUAGES, CONDITIONS } from '../catalog-types';

/**
 * URL state of Sammlung › Karten / Sealed (COL-04, COL-05). Kept apart from the pipeline in
 * view.ts, because the route tree validates it at startup.
 */

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

export const COLLECTION_VIEWS = ['grid', 'table'] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export const LOT_SORTS = [
  'added',
  'name',
  'number',
  'bought',
  'cost',
  'quantity',
  // With prices (M4): per copy, total, P/L in euros and percent, and the price's date.
  'unitValue',
  'value',
  'pl',
  'plRatio',
  'priceDate',
] as const;
export type LotSort = (typeof LOT_SORTS)[number];

export const LOT_GROUPS = ['set', 'language', 'rarity', 'type', 'location'] as const;
export type LotGroup = (typeof LOT_GROUPS)[number];

/** Location filter value for lots without a location. */
export const NO_LOCATION = 'none';

export const collectionSearchSchema = z.object({
  view: optional(z.enum(COLLECTION_VIEWS)),
  q: optional(z.string().max(80)),
  set: optional(z.string().max(80)),
  lang: optional(z.enum(CARD_LANGUAGES)),
  variant: optional(z.string().max(40)),
  cond: optional(z.enum(CONDITIONS)),
  rarity: optional(z.string().max(60)),
  /** Product type (sealed). */
  type: optional(z.string().max(40)),
  graded: optional(z.enum(['yes', 'no'])),
  state: optional(z.enum(['sealed', 'damaged'])),
  tag: optional(z.string().max(80)),
  loc: optional(z.string().max(80)),
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  sort: optional(z.enum(LOT_SORTS)),
  dir: optional(z.enum(['asc', 'desc'])),
  group: optional(z.enum(LOT_GROUPS)),
  /** Also show closed lots (everything sold, traded or opened). */
  closed: optional(z.boolean()),
  /** Lots with a price of their own (series or Eigener Wert), or without. */
  priced: optional(z.enum(['yes', 'no'])),
  /** Only lots whose price is older than the stale threshold. */
  stale: optional(z.boolean()),
  /** Only lots in profit or at a loss (unrealized, DATA_MODEL.md §6.4). */
  pl: optional(z.enum(['gain', 'loss'])),
});
export type CollectionSearch = z.infer<typeof collectionSearchSchema>;
