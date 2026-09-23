import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchDocsQuery, useManifest } from './queries';
import { getSearchClient, parseQuery, type SearchOptions, type SearchResult } from './search';

/**
 * Catalog search for the UI (CAT-04, CAT-06, APP-05): loads the slim search index on first use,
 * builds the worker's index once per catalog version and keeps the last results on screen while
 * the next query runs. `enabled: false` loads nothing (e.g. a closed palette).
 *
 * `owned:ja|nein` in the query keeps the items in (or missing from) `owned`, the ids of items with
 * copies left, which the caller reads from the collection; the catalog layer knows no user data.
 */
export function useCatalogSearch(
  query: string,
  options: SearchOptions = {},
  enabled = true,
  owned?: ReadonlySet<string>,
): { results: SearchResult[]; pending: boolean } {
  const manifest = useManifest();
  const ownedFilter = parseQuery(query).filters.owned;
  // The owned filter runs after the search, so the worker returns every match first.
  const workerOptions = ownedFilter ? { ...options, limit: 0 } : options;
  const docs = useQuery({ ...searchDocsQuery(manifest), enabled });
  const search = useQuery({
    queryKey: ['catalog', manifest.catalogVersion, 'search-results', query, workerOptions],
    queryFn: async () => {
      const client = getSearchClient();
      await client.init(manifest.catalogVersion, docs.data ?? [], manifest.sets);
      return client.search(query, workerOptions);
    },
    enabled: enabled && docs.data !== undefined,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 60_000,
  });
  let results = search.data ?? [];
  if (ownedFilter && owned) {
    results = results.filter((r) => (ownedFilter === 'yes') === owned.has(r.id));
    if (options.limit) results = results.slice(0, options.limit);
  }
  return {
    results,
    pending:
      enabled &&
      (docs.isPending || search.isFetching || (ownedFilter !== undefined && owned === undefined)),
  };
}
