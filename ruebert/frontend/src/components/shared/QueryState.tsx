import type { ReactNode } from 'react';

import type { ApiError } from '@/api/client';

/** Loading and error text for a query. Errors show the German message of the API as it is. */
export function QueryState({ error, isLoading, children }: { error: unknown; isLoading: boolean; children: ReactNode }) {
  if (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler.';
    const status = (error as Partial<ApiError>).status;
    return (
      <div role="alert" className="rounded-lg border border-warning-border bg-warning-soft p-4 text-dense text-warning-text">
        {message}
        {status === 503 && <span className="block text-caption text-muted-foreground">Der Datenstand fehlt: Bitte make rebuild ausführen.</span>}
      </div>
    );
  }
  if (isLoading) return <p className="text-dense text-muted-foreground">Lade …</p>;
  return <>{children}</>;
}
