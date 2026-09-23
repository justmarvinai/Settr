import { z } from 'zod';
import { CARD_LANGUAGES } from '@/domain/catalog-types';
import { CARD_SECTIONS } from '@/domain/catalog';

/**
 * URL search params of the catalog pages (ARCHITECTURE.md §5: filters, sort and view live in the
 * URL). Unknown or broken values fall back to the defaults instead of an error page. They live
 * here, not in the feature, so route files import them without pulling the pages into the entry.
 */
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

export const setsSearchSchema = z.object({
  print: optional(z.enum(['intl', 'asia'])),
});

export const SET_SORTS = ['number', 'name', 'rarity'] as const;
export type SetSort = (typeof SET_SORTS)[number];

export const setSearchSchema = z.object({
  lang: optional(z.enum(CARD_LANGUAGES)),
  section: optional(z.enum(CARD_SECTIONS)),
  rarity: optional(z.string().max(40)),
  /** An energy type (`fire`) or a card category (`trainer`, `energy`). */
  type: optional(z.string().max(40)),
  sort: optional(z.enum(SET_SORTS)),
  q: optional(z.string().max(80)),
  view: optional(z.enum(['grid', 'list'])),
  names: optional(z.enum(['german', 'card'])),
});
export type SetSearch = z.infer<typeof setSearchSchema>;

export const cardSearchSchema = z.object({
  lang: optional(z.enum(CARD_LANGUAGES)),
});

export const sealedSearchSchema = z.object({
  print: optional(z.enum(['intl', 'asia'])),
  lang: optional(z.enum(CARD_LANGUAGES)),
  type: optional(z.string().max(40)),
  q: optional(z.string().max(80)),
});
export type SealedSearch = z.infer<typeof sealedSearchSchema>;

export const productSearchSchema = z.object({
  lang: optional(z.enum(CARD_LANGUAGES)),
});
