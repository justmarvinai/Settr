import { z } from 'zod';
import { ACTIVE_CARD_LANGUAGES } from '../catalog-types';
import { cardLanguageSchema, conditionSchema } from './common';
import { PRICE_TYPES } from './price';

/**
 * Settings (kv `settings`, DATA_MODEL.md §5.9). Stored values are merged with these defaults on every
 * read, so settings added later appear automatically. `prefault` makes nested defaults apply.
 */
export const THEMES = ['system', 'light', 'dark'] as const;
export const MOTION_LEVELS = ['full', 'reduced', 'off'] as const;

export const settingsSchema = z.object({
  cardLanguages: z
    .array(cardLanguageSchema)
    .min(1)
    .default([...ACTIVE_CARD_LANGUAGES]),
  defaultCardLanguage: cardLanguageSchema.default('de'),
  defaultCondition: conditionSchema.default('NM'),
  nameDisplay: z.enum(['copy', 'german', 'original']).default('copy'),
  price: z
    .object({
      defaultType: z.enum(PRICE_TYPES).default('from'),
      cardmarket: z
        .object({
          sellerCountry: z.string().default('DE'),
          matchLanguage: z.boolean().default(true),
          minCondition: conditionSchema.default('NM'),
        })
        .prefault({}),
      guideSuggestions: z.boolean().default(true),
      staleAfterDays: z.number().int().min(1).max(365).default(14),
      unpriced: z.enum(['exclude', 'cost']).default('exclude'),
    })
    .prefault({}),
  display: z
    .object({
      theme: z.enum(THEMES).default('system'),
      reduceTransparency: z.boolean().default(false),
      motion: z.enum(MOTION_LEVELS).default('full'),
      colorblindPL: z.boolean().default(false),
    })
    .prefault({}),
  backup: z.object({ remindAfterDays: z.number().int().min(1).max(90).default(7) }).prefault({}),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Theme = (typeof THEMES)[number];
export type MotionLevel = (typeof MOTION_LEVELS)[number];

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/** Merges stored (possibly outdated or partial) settings with the defaults. Invalid parts fall back. */
export function resolveSettings(stored: unknown): Settings {
  const parsed = settingsSchema.safeParse(stored ?? {});
  if (parsed.success) return parsed.data;
  // Drop invalid top-level keys one by one instead of losing everything.
  const candidate: Record<string, unknown> =
    typeof stored === 'object' && stored !== null ? { ...stored } : {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string') delete candidate[key];
  }
  const retry = settingsSchema.safeParse(candidate);
  return retry.success ? retry.data : DEFAULT_SETTINGS;
}
