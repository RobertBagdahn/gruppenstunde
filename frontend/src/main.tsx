import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import App from './App';
import AuthOverlays from './components/auth/AuthOverlays';
import { handleGlobalApiError } from './lib/apiErrorHandler';
import { setApiErrorListener } from './lib/api';
import './lib/queryMeta';
import { AI_QUOTA_QUERY_KEY } from './api/ai';

// Coded 401/429 responses from any fetchWithCsrf call open the login dialog or an AI-limit toast.
setApiErrorListener((error) => void handleGlobalApiError(error));
import './index.css';

const queryClient = new QueryClient({
  // Hooks built on parseApiResponse throw ApiError; the listener above covers the others.
  mutationCache: new MutationCache({
    onError: (error) => void handleGlobalApiError(error),
    onSettled: (_data, _error, _variables, _context, mutation) => {
      if (mutation.meta?.ai) void queryClient.invalidateQueries({ queryKey: AI_QUOTA_QUERY_KEY });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
          <App />
          <AuthOverlays />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
