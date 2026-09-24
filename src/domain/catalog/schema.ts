import { z } from '@/lib/zod';
import { CARD_LANGUAGES, PRINTS } from '../catalog-types';
import { isoDateSchema, isoTimestampSchema, moneySchema } from '../schemas/common';
import {
  CARD_CATEGORIES,
  CARD_SECTIONS,
  ENERGY_KINDS,
  NAME_SOURCES,
  PRODUCT_EXCLUSIVES,
  VARIANT_KINDS,
} from './vocab';

/**
 * Schemas of the generated catalog files in /catalog/v1 (DATA_MODEL.md §4). Shared by the pipeline
 * (validates before writing) and the app (validates what it loads). Vocabulary fields are plain
 * strings here on purpose; see vocab.ts.
 */
export const CATALOG_SCHEMA_VERSION = 1;

const languageSchema = z.enum(CARD_LANGUAGES);
const printSchema = z.enum(PRINTS);

/** Text per card language; at least one entry. */
export const localizedTextSchema = z
  .partialRecord(languageSchema, z.string().min(1))
  .refine((text) => Object.keys(text).length > 0, { message: 'Mindestens eine Sprache' });

/** An image and the language (and print) of the card it actually shows. */
export const catalogImageSchema = z.object({
  /** Base URL without quality/extension (TCGdex: + `/low.webp`, `/high.webp`). */
  url: z.url(),
  lang: languageSchema,
  /** True when the picture shows the same artwork from the other print (e.g. EN for a JP card). */
  counterpart: z.boolean().optional(),
});

export const cardVariantSchema = z.object({
  id: z.string().min(1),
  /** Only when the variant exists in some of the card's languages. */
  languages: z.array(languageSchema).optional(),
  refs: z
    .object({
      cardmarket: z
        .object({
          default: z.number().int().positive().optional(),
          byLanguage: z.partialRecord(languageSchema, z.number().int().positive()).optional(),
        })
        .optional(),
      tcgplayer: z.number().int().positive().optional(),
    })
    .optional(),
});

export const variantDefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(VARIANT_KINDS),
  label: localizedTextSchema,
});

export const catalogCardSchema = z.object({
  id: z.string().min(1),
  setId: z.string().min(1),
  localId: z.string().min(1),
  /** As printed, e.g. `025/128`, `4/102` (Classic Collection). Empty when nothing is printed. */
  printedNumber: z.string(),
  section: z.enum(CARD_SECTIONS),
  sort: z.number(),
  name: localizedTextSchema,
  nameSource: z.partialRecord(languageSchema, z.enum(NAME_SOURCES)).optional(),
  category: z.enum(CARD_CATEGORIES),
  rarity: z.string().optional(),
  /** Rarity mark as printed per language; null = no mark printed (most JP cards). */
  printedRarity: z.partialRecord(languageSchema, z.string().nullable()).optional(),
  types: z.array(z.string()).optional(),
  hp: z.number().int().positive().optional(),
  stage: z.string().optional(),
  trainerType: z.string().optional(),
  energyKind: z.enum(ENERGY_KINDS).optional(),
  dexIds: z.array(z.number().int().positive()).optional(),
  illustrator: z.string().optional(),
  variants: z.array(cardVariantSchema).min(1),
  languages: z.array(languageSchema).min(1),
  /** Best verified image per card language (may show another language or print; see lang/counterpart). */
  images: z.partialRecord(languageSchema, catalogImageSchema),
  /** Cards with the same artwork in the other print (JP ↔ EN/DE). */
  counterparts: z.array(z.string()).optional(),
  refs: z.object({ tcgdex: z.string().optional() }).optional(),
});

export const catalogSetSummarySchema = z.object({
  id: z.string().min(1),
  print: printSchema,
  series: z.object({ id: z.string().min(1), name: localizedTextSchema }),
  kind: z.enum(['main', 'subset']),
  parentSetId: z.string().optional(),
  name: localizedTextSchema,
  code: z.string().optional(),
  languages: z.array(languageSchema).min(1),
  releaseDates: z.partialRecord(languageSchema, isoDateSchema),
  counts: z.object({
    official: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  /** Names of sections that aren't a set of their own (e.g. M6a's Classic Collection, 136–165). */
  sectionNames: z.partialRecord(z.enum(CARD_SECTIONS), localizedTextSchema).optional(),
  /** The same expansion in the other print (intl:30th ↔ asia:M6a), from the cards' counterparts. */
  otherPrint: z.string().optional(),
  /** A signature card for set tiles, so the Sets page needs no set chunk. */
  cover: z
    .object({
      cardId: z.string().min(1),
      images: z.partialRecord(languageSchema, catalogImageSchema),
    })
    .optional(),
  logo: z.partialRecord(languageSchema, z.url()).optional(),
  symbol: z.url().optional(),
});

/** One lazily loaded chunk: a main set with its subsets and energies (ARCHITECTURE.md §9.1). */
export const catalogSetFileSchema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  set: catalogSetSummarySchema,
  subsets: z.array(catalogSetSummarySchema),
  cards: z.array(catalogCardSchema),
  variantsLegend: z.array(variantDefSchema),
});

export const catalogProductSchema = z.object({
  id: z.string().min(1),
  print: printSchema,
  setIds: z.array(z.string().min(1)).min(1),
  type: z.string().min(1),
  /** Groups design variants of one product line, e.g. the ten Mini-Tins. */
  family: z.string().optional(),
  name: localizedTextSchema,
  languages: z.array(languageSchema).min(1),
  releaseDates: z.partialRecord(languageSchema, isoDateSchema).optional(),
  contents: z
    .object({
      packs: z.number().int().positive().optional(),
      cardsPerPack: z.number().int().positive().optional(),
      promos: z.array(z.string()).optional(),
      description: localizedTextSchema.optional(),
    })
    .optional(),
  msrp: z.partialRecord(languageSchema, moneySchema).optional(),
  ean: z.partialRecord(languageSchema, z.string().min(8)).optional(),
  images: z.partialRecord(languageSchema, catalogImageSchema).optional(),
  exclusive: z.enum(PRODUCT_EXCLUSIVES).nullable().optional(),
  refs: z
    .object({
      cardmarket: z.number().int().positive().optional(),
      tcgplayer: z.number().int().positive().optional(),
    })
    .optional(),
});

export const sealedFileSchema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  products: z.array(catalogProductSchema),
});

/** One slim search document per card and product across all sets (ARCHITECTURE.md §7, ADR-028). */
export const searchDocSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['card', 'sealed']),
  setId: z.string().min(1),
  print: printSchema,
  /** Display name (German first) and every other name and script, for matching. */
  name: z.string().min(1),
  names: z.array(z.string()),
  number: z.string().optional(),
  sort: z.number().optional(),
  rarity: z.string().optional(),
  types: z.array(z.string()).optional(),
  category: z.string().optional(),
  illustrator: z.string().optional(),
  languages: z.array(languageSchema),
  image: catalogImageSchema.optional(),
});

export const searchIndexFileSchema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  catalogVersion: z.string().min(1),
  docs: z.array(searchDocSchema),
});

const fileRefSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().positive(),
});

export const catalogManifestSchema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  catalogVersion: z.string().min(1),
  generatedAt: isoTimestampSchema,
  sources: z.array(
    z.object({ name: z.string(), version: z.string(), license: z.string(), url: z.url() }),
  ),
  /** False when built without network access: image URLs are then unverified candidates. */
  imagesVerified: z.boolean(),
  sets: z.array(catalogSetSummarySchema),
  files: z.object({
    /** Keyed by main set id; subsets live in their parent's chunk. */
    sets: z.record(z.string(), fileRefSchema),
    sealed: fileRefSchema,
    search: fileRefSchema,
  }),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type CatalogImage = z.infer<typeof catalogImageSchema>;
export type CardVariant = z.infer<typeof cardVariantSchema>;
export type VariantDef = z.infer<typeof variantDefSchema>;
export type CatalogCard = z.infer<typeof catalogCardSchema>;
export type CatalogSetSummary = z.infer<typeof catalogSetSummarySchema>;
export type CatalogSetFile = z.infer<typeof catalogSetFileSchema>;
export type CatalogProduct = z.infer<typeof catalogProductSchema>;
export type SealedFile = z.infer<typeof sealedFileSchema>;
export type SearchDoc = z.infer<typeof searchDocSchema>;
export type SearchIndexFile = z.infer<typeof searchIndexFileSchema>;
export type CatalogManifest = z.infer<typeof catalogManifestSchema>;
