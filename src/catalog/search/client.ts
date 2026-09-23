import type { CatalogSetSummary, SearchDoc } from '@/domain/catalog';
import type { SearchEngine, SearchOptions, SearchResult } from './engine';
import type { SearchWorkerRequest, SearchWorkerResponse } from './protocol';

/**
 * Promise-based catalog search (ARCHITECTURE.md §7); the UI wraps it in a hook. The engine runs in
 * workers/search.worker.ts. Without Worker support (Node tests, old browsers), or once the worker
 * has failed, it runs on the main thread, loaded on first use so MiniSearch stays out of the main
 * bundle.
 */
export interface SearchClient {
  /**
   * Builds the index for `catalogVersion` from the search-index.json docs and the manifest's sets.
   * Calling it again with the same version costs nothing; a new version replaces the index.
   */
  init(
    catalogVersion: string,
    docs: readonly SearchDoc[],
    sets: readonly CatalogSetSummary[],
  ): Promise<void>;
  /**
   * Searches the latest index (see SearchEngine.search) and rejects before the first init. Every
   * call resolves with its own results, even when newer searches were sent since: the caller
   * drops stale ones.
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

const NOT_READY = 'Search index not initialised';

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

interface InitJob {
  type: 'init';
  catalogVersion: string;
  docs: readonly SearchDoc[];
  sets: readonly CatalogSetSummary[];
  deferred: Deferred<void>;
}
interface SearchJob {
  type: 'search';
  id: number;
  query: string;
  options?: SearchOptions;
  deferred: Deferred<SearchResult[]>;
}
/** A request the worker hasn't answered yet, with all it takes to run it on the main thread. */
type Job = InitJob | SearchJob;

function initOf(catalogVersion: string | undefined) {
  return (job: Job): job is InitJob => job.type === 'init' && job.catalogVersion === catalogVersion;
}

function searchOf(id: number | undefined) {
  return (job: Job): job is SearchJob => job.type === 'search' && job.id === id;
}

function requestOf(job: Job): SearchWorkerRequest {
  return job.type === 'init'
    ? { type: 'init', catalogVersion: job.catalogVersion, docs: job.docs, sets: job.sets }
    : { type: 'search', id: job.id, query: job.query, options: job.options };
}

let client: SearchClient | undefined;

/** The app's search client, created on first use. */
export function getSearchClient(): SearchClient {
  client ??= typeof Worker === 'undefined' ? createMainThreadClient() : createWorkerClient();
  return client;
}

async function loadEngine(
  docs: readonly SearchDoc[],
  sets: readonly CatalogSetSummary[],
): Promise<SearchEngine> {
  const { createSearchEngine } = await import('./engine');
  return createSearchEngine(docs, sets);
}

function createMainThreadClient(): SearchClient {
  let current: { version: string; engine: Promise<SearchEngine> } | undefined;
  return {
    async init(catalogVersion, docs, sets) {
      if (current?.version !== catalogVersion) {
        current = { version: catalogVersion, engine: loadEngine(docs, sets) };
      }
      const build = current;
      try {
        await build.engine;
      } catch (error) {
        // Forget the failed build, so the same version can be tried again.
        if (current === build) current = undefined;
        throw error;
      }
    },
    async search(query, options) {
      if (!current) throw new Error(NOT_READY);
      const engine = await current.engine;
      return engine.search(query, options);
    },
  };
}

function createWorkerClient(): SearchClient {
  const worker = new Worker(new URL('../../workers/search.worker.ts', import.meta.url), {
    type: 'module',
  });
  let jobs: Job[] = [];
  let current: { version: string; ready: Promise<void> } | undefined;
  /** The index the worker was last asked for, to rebuild it if the worker dies. */
  let latest: Pick<InitJob, 'catalogVersion' | 'docs' | 'sets'> | undefined;
  let fallback: SearchClient | undefined;
  let lastId = 0;

  const send = (job: Job) => {
    jobs.push(job);
    worker.postMessage(requestOf(job));
  };
  /** Removes the jobs matching `answered` from the queue and returns them. */
  const take = <T extends Job>(answered: (job: Job) => job is T): T[] => {
    const taken = jobs.filter(answered);
    jobs = jobs.filter((job) => !answered(job));
    return taken;
  };

  worker.addEventListener('message', (event: MessageEvent<SearchWorkerResponse>) => {
    const response = event.data;
    switch (response.type) {
      case 'ready':
        for (const job of take(initOf(response.catalogVersion))) job.deferred.resolve();
        break;
      case 'results':
        for (const job of take(searchOf(response.id))) job.deferred.resolve(response.results);
        break;
      case 'error': {
        const error = new Error(response.message);
        for (const job of take(searchOf(response.id))) job.deferred.reject(error);
        for (const job of take(initOf(response.catalogVersion))) job.deferred.reject(error);
        // Forget a failed build, so the same version can be sent again.
        if (response.catalogVersion !== undefined && current?.version === response.catalogVersion) {
          current = undefined;
        }
        break;
      }
    }
  });

  // A worker that can't load or crashes: carry on on the main thread and run again, in order,
  // whatever the worker left unanswered.
  const failOver = () => {
    if (fallback) return;
    worker.terminate();
    const mainThread = createMainThreadClient();
    fallback = mainThread;
    current = undefined;
    const unanswered = jobs;
    jobs = [];
    // Rebuild the worker's index unless an init is pending anyway. A failed build shows in the
    // searches that follow, so its own rejection is dropped here.
    if (latest && !unanswered.some((job) => job.type === 'init')) {
      mainThread.init(latest.catalogVersion, latest.docs, latest.sets).catch(() => undefined);
    }
    for (const job of unanswered) {
      if (job.type === 'init') {
        const { resolve, reject } = job.deferred;
        mainThread.init(job.catalogVersion, job.docs, job.sets).then(resolve, reject);
      } else {
        const { resolve, reject } = job.deferred;
        mainThread.search(job.query, job.options).then(resolve, reject);
      }
    }
  };
  worker.addEventListener('error', failOver);
  worker.addEventListener('messageerror', failOver);

  return {
    init(catalogVersion, docs, sets) {
      if (fallback) return fallback.init(catalogVersion, docs, sets);
      if (current?.version === catalogVersion) return current.ready;
      latest = { catalogVersion, docs, sets };
      const ready = new Promise<void>((resolve, reject) => {
        send({ type: 'init', catalogVersion, docs, sets, deferred: { resolve, reject } });
      });
      current = { version: catalogVersion, ready };
      return ready;
    },
    search(query, options) {
      if (fallback) return fallback.search(query, options);
      lastId += 1;
      const id = lastId;
      return new Promise<SearchResult[]>((resolve, reject) => {
        send({ type: 'search', id, query, options, deferred: { resolve, reject } });
      });
    },
  };
}
