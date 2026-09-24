import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { CARD_LANGUAGES } from '../../src/domain/catalog-types';
import { catalogProductSchema } from '../../src/domain/catalog/schema';
import { RARITY_IDS } from '../../src/domain/catalog/vocab';
import { CURATED } from './paths';

const text = z.partialRecord(z.enum(CARD_LANGUAGES), z.string().min(1));

/** Per-card fixes and additions, keyed by upstream local id (DATA_SOURCES.md §6.3). */
const cardOverlaySchema = z
  .object({
    printedNumber: z.string().optional(),
    sort: z.number().optional(),
    /** The rarity where TCGdex's is wrong (a GX it calls Rare). */
    rarity: z.enum(RARITY_IDS).optional(),
    /** Official names that TCGdex lacks or gets wrong. */
    name: text.optional(),
    /** Hand-typed translations (shown as "übersetzt"). */
    curatedName: text.optional(),
    /** Same artwork in the other print; wins over the automatic match. */
    counterpart: z.string().optional(),
    /** Take translated names from this card without linking artwork (e.g. basic Energy). */
    namesFrom: z.string().optional(),
    /** Cardmarket product per card language, where TCGdex's id or the metacard match fails. */
    cardmarket: z.partialRecord(z.enum(CARD_LANGUAGES), z.number().int().positive()).optional(),
    /** Card languages when fewer than the set's exist (e.g. an English-only promo). */
    languages: z.array(z.enum(CARD_LANGUAGES)).min(1).optional(),
    note: z.string().optional(),
  })
  .strict();

const cardOverlayFileSchema = z
  .object({
    setId: z.string(),
    source: z.string().optional(),
    cards: z.record(z.string(), cardOverlaySchema),
  })
  .strict();

export type CardOverlay = z.infer<typeof cardOverlaySchema>;

/** Curated sealed products: the app schema minus images (resolved by the pipeline). */
const sealedEntrySchema = catalogProductSchema
  .omit({ images: true })
  .extend({ note: z.string().optional() })
  .strict();
const sealedFileSchema = z
  .object({ source: z.string().optional(), products: z.array(sealedEntrySchema) })
  .strict();
export type CuratedProduct = z.infer<typeof sealedEntrySchema>;

const readYaml = (file: string): unknown => parse(readFileSync(file, 'utf8'));
const yamlFiles = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.yaml'))
        .toSorted()
    : [];

export function loadCardOverlays(): Map<string, Map<string, CardOverlay>> {
  const bySet = new Map<string, Map<string, CardOverlay>>();
  for (const file of yamlFiles(join(CURATED, 'cards'))) {
    const parsed = cardOverlayFileSchema.parse(readYaml(join(CURATED, 'cards', file)));
    const cards = bySet.get(parsed.setId) ?? new Map<string, CardOverlay>();
    for (const [localId, overlay] of Object.entries(parsed.cards)) cards.set(localId, overlay);
    bySet.set(parsed.setId, cards);
  }
  return bySet;
}

export function loadSealed(): CuratedProduct[] {
  return yamlFiles(join(CURATED, 'sealed')).flatMap(
    (file) => sealedFileSchema.parse(readYaml(join(CURATED, 'sealed', file))).products,
  );
}

/**
 * German and English names for Japanese card names that no artwork match resolves (mostly Items
 * one artist drew several of): the international card to take them from, or the names.
 */
const japaneseNameSchema = z
  .object({
    from: z.string().optional(),
    de: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .strict()
  .refine((n) => n.from || (n.de && n.en), 'needs `from` or both `de` and `en`');
export type JapaneseName = z.infer<typeof japaneseNameSchema>;

export function loadJapaneseNames(): Map<string, JapaneseName> {
  const names = new Map<string, JapaneseName>();
  for (const file of yamlFiles(join(CURATED, 'names'))) {
    const parsed = z
      .record(z.string(), japaneseNameSchema)
      .parse(readYaml(join(CURATED, 'names', file)) ?? {});
    for (const [ja, entry] of Object.entries(parsed)) names.set(ja, entry);
  }
  return names;
}

/** Cards that moved to another set: card id → the set it was in (ADR-061). */
export function loadMovedCards(): Record<string, string> {
  const file = join(CURATED, 'moved-cards.yaml');
  return existsSync(file) ? z.record(z.string(), z.string()).parse(readYaml(file) ?? {}) : {};
}

/** Upstream id changes: old catalog id → new id (DATA_MODEL.md §3). */
export function loadIdAliases(): Record<string, string> {
  const file = join(CURATED, 'id-aliases.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>) : {};
}
