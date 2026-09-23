import { z } from 'zod';
import {
  cardLanguageSchema,
  conditionSchema,
  foreignMoneySchema,
  isoDateSchema,
  isoTimestampSchema,
  itemRefSchema,
  itemSnapshotSchema,
  recordBaseSchema,
  uuidV7Schema,
} from './common';

export const PRICE_TYPES = ['from', 'trend', 'avg30', 'avg7', 'avg1', 'sold', 'manual'] as const;
export const PRICE_SOURCES = ['cardmarket', 'ebay', 'tcgplayer', 'local', 'other'] as const;

/** One manual price observation for one unit (DATA_MODEL.md §5.3). */
export const priceEntrySchema = recordBaseSchema.extend({
  seriesKey: z.string().min(1),
  item: itemRefSchema,
  language: cardLanguageSchema,
  variant: z.string().optional(),
  grade: z.string().min(1),
  snapshot: itemSnapshotSchema,
  date: isoDateSchema,
  price: foreignMoneySchema,
  priceType: z.enum(PRICE_TYPES),
  source: z.enum(PRICE_SOURCES),
  /** How the price was looked up: German sellers, the copy's language, Near Mint or better (R2.2). */
  context: z
    .object({
      sellerCountry: z.string().optional(),
      language: cardLanguageSchema.optional(),
      minCondition: conditionSchema.optional(),
    })
    .optional(),
  origin: z.enum(['manual', 'guide']),
  note: z.string().optional(),
});

/** Materialized latest price per series; derived, rebuildable, never exported (DATA_MODEL.md §5.4). */
export const priceLatestSchema = z.object({
  seriesKey: z.string().min(1),
  entryId: uuidV7Schema,
  date: isoDateSchema,
  createdAt: isoTimestampSchema, // copied from the entry: breaks ties on the same date
  price: foreignMoneySchema,
});

export type PriceType = (typeof PRICE_TYPES)[number];
export type PriceEntry = z.infer<typeof priceEntrySchema>;
export type PriceLatest = z.infer<typeof priceLatestSchema>;
