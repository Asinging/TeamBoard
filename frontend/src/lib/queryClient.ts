import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // data is fresh for 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
