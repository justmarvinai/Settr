import { z } from '@/lib/zod';
import { CARD_LANGUAGES, CONDITIONS, GRADING_COMPANIES, PRINTS } from '../catalog-types';
import { isUuidV7 } from '../ids';
import { CURRENCIES } from '../money';

export const isoDateSchema = z.iso.date();
export const isoTimestampSchema = z.iso.datetime({ offset: true });
export const uuidV7Schema = z.string().refine(isUuidV7, { message: 'Keine gültige ID (UUIDv7)' });

export const currencySchema = z.enum(CURRENCIES);
export const moneySchema = z.object({
  minor: z.number().int().refine(Number.isSafeInteger),
  currency: currencySchema,
});
export const foreignMoneySchema = moneySchema.extend({
  fx: z
    .object({ rate: z.number().positive(), date: isoDateSchema, source: z.enum(['ecb', 'manual']) })
    .optional(),
});

export const printSchema = z.enum(PRINTS);
export const cardLanguageSchema = z.enum(CARD_LANGUAGES);
export const conditionSchema = z.enum(CONDITIONS);
export const gradingCompanySchema = z.enum(GRADING_COMPANIES);

/** Catalog id (e.g. intl:30th:150) or custom:<uuidv7>. Opaque: never parsed. */
export const itemRefSchema = z.object({
  kind: z.enum(['card', 'sealed']),
  id: z.string().min(1),
});

/** Tiny display snapshot so records stay readable if the catalog changes (DATA_MODEL.md §4.2). */
export const itemSnapshotSchema = z.object({
  name: z.string(),
  setName: z.string().optional(),
  localId: z.string().optional(),
  image: z.string().optional(),
});

export const recordBaseSchema = z.object({
  id: uuidV7Schema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ItemSnapshot = z.infer<typeof itemSnapshotSchema>;
export type ForeignMoney = z.infer<typeof foreignMoneySchema>;
export type RecordBase = z.infer<typeof recordBaseSchema>;
