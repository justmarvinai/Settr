import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchDocsQuery, useManifest } from './queries';
import { getSearchClient, type SearchOptions, type SearchResult } from './search';

/**
 * Catalog search for the UI (CAT-04, CAT-06, APP-05): loads the slim search index on first use,
 * builds the worker's index once per catalog version and keeps the last results on screen while
 * the next query runs. `enabled: false` loads nothing (e.g. a closed palette).
 */
export function useCatalogSearch(
  query: string,
  options: SearchOptions = {},
  enabled = true,
): { results: SearchResult[]; pending: boolean } {
  const manifest = useManifest();
  const docs = useQuery({ ...searchDocsQuery(manifest), enabled });
  const search = useQuery({
    queryKey: ['catalog', manifest.catalogVersion, 'search-results', query, options],
    queryFn: async () => {
      const client = getSearchClient();
      await client.init(manifest.catalogVersion, docs.data ?? [], manifest.sets);
      return client.search(query, options);
    },
    enabled: enabled && docs.data !== undefined,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 60_000,
  });
  return {
    results: search.data ?? [],
    pending: enabled && (docs.isPending || search.isFetching),
  };
}
