import type { CatalogSetSummary, SearchDoc } from '@/domain/catalog';
import type { SearchOptions, SearchResult } from './engine';

/**
 * Messages between the search client (client.ts) and workers/search.worker.ts. The worker holds one
 * engine: `init` with a new catalog version rebuilds it, the same version only answers `ready`.
 * Messages are handled in order, so a search sent after an init searches the new index.
 */
export type SearchWorkerRequest =
  | {
      type: 'init';
      catalogVersion: string;
      /** search-index.json docs. */
      docs: readonly SearchDoc[];
      /** The manifest's sets (names, codes, subsets). */
      sets: readonly CatalogSetSummary[];
    }
  | { type: 'search'; id: number; query: string; options?: SearchOptions };

export type SearchWorkerResponse =
  | { type: 'ready'; catalogVersion: string; size: number }
  | { type: 'results'; id: number; results: SearchResult[] }
  /** A failed search carries its `id`, a failed init its `catalogVersion`. */
  | { type: 'error'; id?: number; catalogVersion?: string; message: string };
