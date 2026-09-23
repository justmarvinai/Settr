import { createSearchEngine, type SearchEngine } from '@/catalog/search/engine';
import type { SearchWorkerRequest, SearchWorkerResponse } from '@/catalog/search/protocol';

/**
 * Search worker (ARCHITECTURE.md §7): hosts the catalog search engine off the main thread. Talk to
 * it through getSearchClient() (catalog/search/client.ts); the protocol is in protocol.ts.
 */

/** The part of the worker's global scope used here, typed with the protocol. */
interface SearchWorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<SearchWorkerRequest>) => void,
  ): void;
  postMessage(message: SearchWorkerResponse): void;
}

const scope: SearchWorkerScope = self;
let engine: SearchEngine | undefined;
let engineVersion: string | undefined;

function handle(request: SearchWorkerRequest): SearchWorkerResponse {
  if (request.type === 'search') {
    if (!engine) return { type: 'error', id: request.id, message: 'Search index not initialised' };
    return {
      type: 'results',
      id: request.id,
      results: engine.search(request.query, request.options),
    };
  }
  // A failed build throws before the assignment, so the previous index stays usable.
  if (!engine || engineVersion !== request.catalogVersion) {
    engine = createSearchEngine(request.docs, request.sets);
    engineVersion = request.catalogVersion;
  }
  return { type: 'ready', catalogVersion: request.catalogVersion, size: engine.size };
}

function failure(request: SearchWorkerRequest, error: unknown): SearchWorkerResponse {
  const message = error instanceof Error ? error.message : String(error);
  return request.type === 'search'
    ? { type: 'error', id: request.id, message }
    : { type: 'error', catalogVersion: request.catalogVersion, message };
}

scope.addEventListener('message', (event) => {
  let response: SearchWorkerResponse;
  try {
    response = handle(event.data);
  } catch (error) {
    response = failure(event.data, error);
  }
  scope.postMessage(response);
});
