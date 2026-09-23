import { z } from 'zod';
import {
  cardLanguageSchema,
  conditionSchema,
  foreignMoneySchema,
  gradingCompanySchema,
  isoDateSchema,
  itemRefSchema,
  itemSnapshotSchema,
  moneySchema,
  printSchema,
  recordBaseSchema,
  uuidV7Schema,
} from './common';

export const gradingSchema = z.object({
  company: gradingCompanySchema,
  companyName: z.string().optional(),
  grade: z.string().min(1),
  qualifier: z.string().optional(),
  cert: z.string().optional(),
  subgrades: z
    .object({
      centering: z.string().optional(),
      corners: z.string().optional(),
      edges: z.string().optional(),
      surface: z.string().optional(),
    })
    .optional(),
});

export const disposalSchema = z.object({
  id: uuidV7Schema,
  type: z.enum(['sale', 'trade', 'gift', 'opened', 'lost']),
  date: isoDateSchema,
  quantity: z.number().int().positive(),
  proceedsTotal: foreignMoneySchema.optional(),
  feesTotal: foreignMoneySchema.optional(),
  note: z.string().optional(),
});

/** A lot: identical items acquired together (DATA_MODEL.md §5.2). */
export const holdingSchema = recordBaseSchema
  .extend({
    item: itemRefSchema,
    setId: z.string().optional(),
    print: printSchema.optional(),
    snapshot: itemSnapshotSchema,
    language: cardLanguageSchema,
    variant: z.string().optional(),
    condition: conditionSchema.optional(),
    grading: gradingSchema.optional(),
    sealedState: z.enum(['sealed', 'damaged']).optional(),
    flags: z
      .object({
        signed: z.boolean().optional(),
        altered: z.boolean().optional(),
        misprint: z.boolean().optional(),
      })
      .optional(),
    quantity: z.number().int().positive(),
    acquisition: z.object({
      type: z.enum(['purchase', 'pull', 'trade', 'gift', 'other']),
      date: isoDateSchema.optional(),
      priceTotal: foreignMoneySchema.optional(),
      feesTotal: foreignMoneySchema.optional(),
      source: z.string().optional(),
      fromHoldingId: uuidV7Schema.optional(),
    }),
    disposals: z.array(disposalSchema),
    /** "Eigener Wert": per-lot value, e.g. for copies below Near Mint (PRC-07, R2.2). */
    valueOverride: z
      .object({ price: moneySchema, date: isoDateSchema, note: z.string().optional() })
      .optional(),
    tags: z.array(z.string()),
    location: z
      .object({
        id: z.string(),
        page: z.number().int().positive().optional(),
        slot: z.number().int().positive().optional(),
        note: z.string().optional(),
      })
      .optional(),
    mediaIds: z.array(z.string()),
    note: z.string().optional(),
  })
  .refine((h) => h.disposals.reduce((n, d) => n + d.quantity, 0) <= h.quantity, {
    message: 'Es wurden mehr Exemplare abgegeben als vorhanden sind',
    path: ['disposals'],
  });

export type Grading = z.infer<typeof gradingSchema>;
export type Disposal = z.infer<typeof disposalSchema>;
export type Holding = z.infer<typeof holdingSchema>;

/** Units still held (DATA_MODEL.md §5.2). */
export function remaining(h: Pick<Holding, 'quantity' | 'disposals'>): number {
  return h.quantity - h.disposals.reduce((n, d) => n + d.quantity, 0);
}

export function isOpen(h: Pick<Holding, 'quantity' | 'disposals'>): boolean {
  return remaining(h) > 0;
}
