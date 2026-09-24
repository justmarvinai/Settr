import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type ParsedLocation } from '@tanstack/react-router';
import { morphWanted } from '@/lib/hero';
import { routeTree } from '../routeTree.gen';
import { ErrorPage, NotFoundPage } from './errors';
import { queryClient } from './queryClient';

export interface RouterContext {
  queryClient: QueryClient;
}

const CARD_PAGE = /^\/catalog\/sets\/[^/]+\/cards\/[^/]+$/;

/**
 * Back and forward between a grid and a card page morph the picture too (DSN-02); every other
 * navigation stays instant. Links opt in themselves. Needs view-transition types to tell them
 * apart; browsers without them just don't morph on back and forward.
 */
function cardMorph({
  fromLocation,
  toLocation,
}: {
  fromLocation?: ParsedLocation;
  toLocation: ParsedLocation;
}): string[] | false {
  if (!fromLocation || !morphWanted()) return false;
  return CARD_PAGE.test(fromLocation.pathname) !== CARD_PAGE.test(toLocation.pathname)
    ? ['card']
    : false;
}

const viewTransitionTypes =
  typeof CSS !== 'undefined' && CSS.supports('selector(:active-view-transition-type(a))');

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Loaders only warm the query cache; TanStack Query decides freshness.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Catalog ids keep their colons in URLs: /catalog/sets/intl:30th (ids are never parsed).
  pathParamsAllowedCharacters: [':'],
  defaultViewTransition: viewTransitionTypes ? { types: cardMorph } : false,
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
