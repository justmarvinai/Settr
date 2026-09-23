import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';
import { ErrorPage, NotFoundPage } from './errors';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
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
