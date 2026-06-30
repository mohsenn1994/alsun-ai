import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

/**
 * App bootstrap. Creates the TanStack Query client (server-state cache) and
 * mounts <App/> inside its provider.
 *   - retry: 1               → one retry on failure, then surface the error
 *   - refetchOnWindowFocus   → off; this app's data doesn't need aggressive refetching
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
