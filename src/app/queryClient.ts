import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query only serves the static catalog (user data comes from Dexie live queries), so
 * nothing refetches on focus or reconnect; a failed file is retried once.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
