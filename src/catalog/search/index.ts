/**
 * Catalog search (ARCHITECTURE.md §7): the worker-backed search client, the power-user query
 * syntax and the text normalization, for the UI. The engine (engine.ts, with MiniSearch) is only
 * reached through the client, which keeps it out of the main bundle.
 */
export { getSearchClient, type SearchClient } from './client';
export type { SearchEngine, SearchOptions, SearchResult } from './engine';
export { normalizeText, tokenize, type TokenizeMode, type UmlautMode } from './normalize';
export type { SearchWorkerRequest, SearchWorkerResponse } from './protocol';
export { parseQuery, type ParsedQuery, type QueryFilters } from './query';
