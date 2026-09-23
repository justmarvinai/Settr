import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { CARD_LANGUAGES } from '../../src/domain/catalog-types';
import { catalogProductSchema } from '../../src/domain/catalog/schema';
import { CURATED } from './paths';

const text = z.partialRecord(z.enum(CARD_LANGUAGES), z.string().min(1));

/** Per-card fixes and additions, keyed by upstream local id (DATA_SOURCES.md §6.3). */
const cardOverlaySchema = z
  .object({
    printedNumber: z.string().optional(),
    sort: z.number().optional(),
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

/** Upstream id changes: old catalog id → new id (DATA_MODEL.md §3). */
export function loadIdAliases(): Record<string, string> {
  const file = join(CURATED, 'id-aliases.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>) : {};
}
