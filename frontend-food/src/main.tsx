import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import AuthOverlays from './components/auth/AuthOverlays';
import GlobalFetchingBar from './components/shared/GlobalFetchingBar';
import { ApiError } from './lib/api';
import { handleGlobalApiError } from './lib/apiErrorHandler';
import './lib/queryMeta';
import { AI_QUOTA_QUERY_KEY } from './api/ai';
import './index.css';

const queryClient = new QueryClient({
  // Mutations: 401/AI-limit codes open the login dialog or a toast. Queries only react to
  // AI limits; read endpoints are public, so a 401 there is shown by the page itself.
  mutationCache: new MutationCache({
    onError: (error) => void handleGlobalApiError(error),
    onSettled: (_data, _error, _variables, _context, mutation) => {
      if (mutation.meta?.ai) void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
    },
  }),
  queryCache: new QueryCache({
    onSettled: (_data, _error, query) => {
      if (query.meta?.ai) void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
    },
    onError: (error) => {
      if (error instanceof Error && 'code' in error && String(error.code).startsWith('ai_')) {
        handleGlobalApiError(error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Client errors (404, 403 …) will not change on a retry; only transient failures are retried once.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <AuthOverlays />
          <GlobalFetchingBar />
          {/* Top centre: visible and clear of the mobile action bar at the bottom (food-feedback-toasts). */}
          <Toaster
            position="top-center"
            richColors
            closeButton
            offset="calc(env(safe-area-inset-top, 0px) + 72px)"
            mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
            toastOptions={{
              duration: 4000,
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
