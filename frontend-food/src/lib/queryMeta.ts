/**
 * Typed TanStack meta. `ai: true` marks requests that spend AI budget, so the
 * quota display refreshes after them (see main.tsx).
 */
import '@tanstack/react-query';

export interface AppQueryMeta extends Record<string, unknown> {
  ai?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: AppQueryMeta;
    mutationMeta: AppQueryMeta;
  }
}

export const AI_META: AppQueryMeta = { ai: true };
