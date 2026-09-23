import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';
import { ErrorPage, NotFoundPage } from './errors';
import { queryClient } from './queryClient';

export interface RouterContext {
  queryClient: QueryClient;
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Loaders only warm the query cache; TanStack Query decides freshness.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Catalog ids keep their colons in URLs: /catalog/sets/intl:30th (ids are never parsed).
  pathParamsAllowedCharacters: [':'],
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    /** Toolbar and document title; a message function, so it stays translatable. */
    title?: () => string;
  }
}
