import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { chunkSetId, type CatalogManifest } from '@/domain/catalog';
import { fetchManifest, fetchSealed, fetchSearchDocs, fetchSet } from './api';

/**
 * TanStack Query options for the catalog (ARCHITECTURE.md §5): static files, so nothing goes
 * stale while the app runs; a new catalog version shows up on the next start.
 */
export const manifestQuery = queryOptions({
  queryKey: ['catalog', 'manifest'],
  queryFn: fetchManifest,
  staleTime: Infinity,
  gcTime: Infinity,
});

export const setQuery = (manifest: CatalogManifest, setId: string) =>
  queryOptions({
    queryKey: ['catalog', manifest.catalogVersion, 'set', chunkSetId(setId, manifest.sets)],
    queryFn: () => fetchSet(manifest, setId),
    staleTime: Infinity,
  });

export const sealedQuery = (manifest: CatalogManifest) =>
  queryOptions({
    queryKey: ['catalog', manifest.catalogVersion, 'sealed'],
    queryFn: () => fetchSealed(manifest),
    staleTime: Infinity,
  });

export const searchDocsQuery = (manifest: CatalogManifest) =>
  queryOptions({
    queryKey: ['catalog', manifest.catalogVersion, 'search'],
    queryFn: () => fetchSearchDocs(manifest),
    staleTime: Infinity,
  });

export function useManifest(): CatalogManifest {
  return useSuspenseQuery(manifestQuery).data;
}

export function useCatalogSet(setId: string) {
  const manifest = useManifest();
  return useSuspenseQuery(setQuery(manifest, setId)).data;
}

export function useSealed() {
  const manifest = useManifest();
  return useSuspenseQuery(sealedQuery(manifest)).data;
}
