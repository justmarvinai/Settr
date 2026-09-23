import {
  catalogManifestSchema,
  catalogSetFileSchema,
  chunkSetId,
  compareCards,
  sealedFileSchema,
  searchIndexFileSchema,
  type CatalogCard,
  type CatalogManifest,
  type CatalogProduct,
  type CatalogSetFile,
  type CatalogSetSummary,
  type SearchDoc,
} from '@/domain/catalog';

/**
 * Loads the generated catalog (public/catalog/v1, ARCHITECTURE.md §9.1). The only code that
 * fetches catalog JSON. Every file is validated; hashed files carry their hash in the query so the
 * service worker can cache them for good (§8.1).
 */
const BASE = '/catalog/v1';

export class CatalogLoadError extends Error {
  readonly url: string;
  readonly status: number | undefined;
  constructor(url: string, status?: number) {
    super(`Catalog file ${url} failed to load${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'CatalogLoadError';
    this.url = url;
    this.status = status;
  }
}

async function getJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new CatalogLoadError(url);
  }
  if (!response.ok) throw new CatalogLoadError(url, response.status);
  return response.json();
}

type FileRef = CatalogManifest['files']['sealed'];
const fileUrl = (ref: FileRef) => `${BASE}/${ref.path}?h=${ref.sha256.slice(0, 16)}`;

export function fetchManifest(): Promise<CatalogManifest> {
  return getJson(`${BASE}/manifest.json`).then((json) => catalogManifestSchema.parse(json));
}

/** One set chunk with its lookups, built once per catalog version (TanStack Query cache). */
export interface LoadedSet {
  set: CatalogSetSummary;
  subsets: CatalogSetSummary[];
  /** Set order: sections, then number (DATA_MODEL.md §4.2). */
  cards: CatalogCard[];
  byId: Map<string, CatalogCard>;
  /** The main set and its subsets by id. */
  sets: Map<string, CatalogSetSummary>;
  variantsLegend: CatalogSetFile['variantsLegend'];
}

export async function fetchSet(manifest: CatalogManifest, setId: string): Promise<LoadedSet> {
  const chunk = chunkSetId(setId, manifest.sets);
  const ref = manifest.files.sets[chunk];
  if (!ref) throw new CatalogLoadError(`${BASE}/sets/${chunk}`, 404);
  const file = catalogSetFileSchema.parse(await getJson(fileUrl(ref)));
  const cards = file.cards.toSorted(compareCards);
  return {
    set: file.set,
    subsets: file.subsets,
    cards,
    byId: new Map(cards.map((card) => [card.id, card])),
    sets: new Map([file.set, ...file.subsets].map((s) => [s.id, s])),
    variantsLegend: file.variantsLegend,
  };
}

export interface LoadedSealed {
  products: CatalogProduct[];
  byId: Map<string, CatalogProduct>;
}

export async function fetchSealed(manifest: CatalogManifest): Promise<LoadedSealed> {
  const { products } = sealedFileSchema.parse(await getJson(fileUrl(manifest.files.sealed)));
  return { products, byId: new Map(products.map((p) => [p.id, p])) };
}

export async function fetchSearchDocs(manifest: CatalogManifest): Promise<SearchDoc[]> {
  const file = searchIndexFileSchema.parse(await getJson(fileUrl(manifest.files.search)));
  return file.docs;
}
