import { z } from '@/lib/zod';
import {
  cardLanguageSchema,
  isoTimestampSchema,
  itemRefSchema,
  itemSnapshotSchema,
  moneySchema,
  printSchema,
  recordBaseSchema,
} from './common';

export const tagSchema = recordBaseSchema.extend({
  name: z.string().min(1),
  color: z.string().optional(),
});

/** Binders, boxes, cases (DATA_MODEL.md §5.6). Binder slots are 1-based, left→right, top→bottom. */
export const locationSchema = recordBaseSchema.extend({
  name: z.string().min(1),
  kind: z.enum(['binder', 'box', 'case', 'display', 'other']),
  layout: z
    .object({ columns: z.number().int().positive(), rows: z.number().int().positive() })
    .optional(),
  pages: z.number().int().positive().optional(),
  parentId: z.string().optional(),
  sort: z.number().optional(),
});

export const wishlistItemSchema = recordBaseSchema.extend({
  item: itemRefSchema,
  snapshot: itemSnapshotSchema,
  language: cardLanguageSchema.optional(),
  variant: z.string().optional(),
  grade: z.string().optional(),
  targetPrice: moneySchema.optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  note: z.string().optional(),
});

export const customItemSchema = recordBaseSchema.extend({
  kind: z.enum(['card', 'sealed']),
  name: z.partialRecord(cardLanguageSchema, z.string()),
  setName: z.string().optional(),
  setId: z.string().optional(),
  localId: z.string().optional(),
  print: printSchema.optional(),
  languages: z.array(cardLanguageSchema).min(1),
  productType: z.string().optional(),
  rarity: z.string().optional(),
  variants: z.array(z.string()).optional(),
  imageMediaId: z.string().optional(),
  imageUrl: z.string().optional(),
  note: z.string().optional(),
});

export const tombstoneSchema = z.object({
  id: z.string().min(1),
  table: z.string().min(1),
  deletedAt: isoTimestampSchema,
});

/** kv `meta` (DATA_MODEL.md §5.9). */
export const metaSchema = z.object({
  installId: z.string().min(1),
  createdAt: isoTimestampSchema,
  schemaVersion: z.number().int().positive(),
  lastBackupAt: isoTimestampSchema.optional(),
  /** The change counter (kv `dataVersion`) when the last backup was made (DAT-04). */
  backupDataVersion: z.number().int().nonnegative().optional(),
  lastImportAt: isoTimestampSchema.optional(),
  catalogVersionSeen: z.string().nullable(),
});

export type Tag = z.infer<typeof tagSchema>;
export type Location = z.infer<typeof locationSchema>;
export type WishlistItem = z.infer<typeof wishlistItemSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;
export type Tombstone = z.infer<typeof tombstoneSchema>;
export type Meta = z.infer<typeof metaSchema>;
