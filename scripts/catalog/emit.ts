import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  CATALOG_SCHEMA_VERSION,
  catalogManifestSchema,
  catalogSetFileSchema,
  compareCards,
  pickText,
  searchIndexFileSchema,
  sealedFileSchema,
  type CatalogCard,
  type CatalogManifest,
  type CatalogProduct,
  type CatalogSetFile,
  type SearchDoc,
} from '../../src/domain/catalog';
import type { BuiltCard, BuiltSet } from './build';
import { speciesAliases, type SpeciesNames } from './names';
import { OUT, readLock } from './paths';

/**
 * JSON that diffs well in catalog PRs: two-space objects, but arrays of objects one element per
 * line (a card is one line).
 */
export function stableJson(value: unknown, indent = ''): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => v === null || typeof v !== 'object')) return JSON.stringify(value);
    const inner = `${indent}  `;
    return `[\n${value.map((v) => inner + JSON.stringify(v)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    const inner = `${indent}  `;
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${stableJson(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
/** Chunk file name for a set id (ids are opaque; this only has to be unique and URL-safe). */
export const fileNameFor = (setId: string) => `${setId.replace(/[^A-Za-z0-9._-]/g, '_')}.json`;

function publicCard(card: BuiltCard): CatalogCard {
  const { source: _source, ...rest } = card;
  return rest;
}

function searchDocs(
  sets: BuiltSet[],
  products: CatalogProduct[],
  species: Map<number, SpeciesNames>,
): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const set of sets) {
    for (const card of set.cards) {
      const names = [
        ...new Set(
          [...Object.values(card.name), ...speciesAliases(card.dexIds, species)].filter(Boolean),
        ),
      ];
      const image =
        card.images[card.languages[0] as keyof typeof card.images] ?? Object.values(card.images)[0];
      docs.push({
        id: card.id,
        kind: 'card',
        setId: card.setId,
        print: set.config.print,
        name: pickText(card.name),
        names,
        ...(card.printedNumber ? { number: card.printedNumber } : {}),
        sort: card.sort,
        ...(card.rarity ? { rarity: card.rarity } : {}),
        ...(card.types ? { types: card.types } : {}),
        category: card.category,
        ...(card.illustrator ? { illustrator: card.illustrator } : {}),
        languages: card.languages,
        ...(image ? { image } : {}),
      });
    }
  }
  for (const product of products) {
    docs.push({
      id: product.id,
      kind: 'sealed',
      setId: product.setIds[0] as string,
      print: product.print,
      name: pickText(product.name),
      names: [...new Set(Object.values(product.name))],
      category: product.type,
      languages: product.languages,
    });
  }
  return docs;
}

function write(relative: string, content: string) {
  const file = join(OUT, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return { path: relative, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

/** Validates and writes public/catalog/v1 (DATA_SOURCES.md §6.2 steps 6–7). */
export function emitCatalog(
  sets: BuiltSet[],
  products: CatalogProduct[],
  species: Map<number, SpeciesNames>,
  options: { imagesVerified: boolean; generatedAt: string; previous: CatalogManifest | null },
): CatalogManifest {
  const { previous } = options;
  const manifestFile = join(OUT, 'manifest.json');
  rmSync(join(OUT, 'sets'), { recursive: true, force: true });

  const setFiles: CatalogManifest['files']['sets'] = {};
  for (const set of sets.filter((s) => s.config.kind === 'main')) {
    const members = sets.filter(
      (s) => s.config.id === set.config.id || s.config.parentSetId === set.config.id,
    );
    const file: CatalogSetFile = catalogSetFileSchema.parse({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      set: set.summary,
      subsets: members.filter((s) => s !== set).map((s) => s.summary),
      cards: members.flatMap((s) => s.cards.map(publicCard)).toSorted(compareCards),
      variantsLegend: [{ id: 'std', kind: 'finish', label: { de: 'Standard', en: 'Standard' } }],
    });
    setFiles[set.config.id] = write(`sets/${fileNameFor(set.config.id)}`, `${stableJson(file)}\n`);
  }
  const sealed = write(
    'sealed.json',
    `${stableJson(sealedFileSchema.parse({ schemaVersion: CATALOG_SCHEMA_VERSION, products }))}\n`,
  );

  const unchanged = (search: string) =>
    previous !== null &&
    JSON.stringify(previous.files.sets) === JSON.stringify(setFiles) &&
    previous.files.sealed.sha256 === sealed.sha256 &&
    previous.files.search.sha256 === sha256(search) &&
    previous.imagesVerified === options.imagesVerified;

  // The search index names the catalog version, so it's written once the version is known.
  const docs = searchDocs(sets, products, species);
  const draft = (catalogVersion: string) =>
    `${stableJson(searchIndexFileSchema.parse({ schemaVersion: CATALOG_SCHEMA_VERSION, catalogVersion, docs }))}\n`;
  const reuse = previous && unchanged(draft(previous.catalogVersion));
  const date = options.generatedAt.slice(0, 10).replaceAll('-', '.');
  const catalogVersion = reuse
    ? previous.catalogVersion
    : `${date}.${previous?.catalogVersion.startsWith(date) ? Number(previous.catalogVersion.split('.')[3] ?? 0) + 1 : 1}`;
  const search = write('search-index.json', draft(catalogVersion));

  const lock = readLock();
  const manifest = catalogManifestSchema.parse({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogVersion,
    generatedAt: reuse ? previous.generatedAt : options.generatedAt,
    sources: [
      {
        name: 'TCGdex cards-database',
        version: lock.tcgdex.commit,
        license: lock.tcgdex.license,
        url: lock.tcgdex.repo,
      },
      {
        name: 'PTCG-database (Traditional Chinese names)',
        version: lock.ptcgDatabase.commit,
        license: lock.ptcgDatabase.license,
        url: lock.ptcgDatabase.repo,
      },
      {
        name: 'PokéAPI (species names)',
        version: lock.pokeapi.commit,
        license: lock.pokeapi.license,
        url: lock.pokeapi.repo,
      },
    ],
    imagesVerified: options.imagesVerified,
    sets: sets.map((s) => s.summary),
    files: { sets: setFiles, sealed, search },
  });
  writeFileSync(manifestFile, `${stableJson(manifest)}\n`);
  return manifest;
}
