import { Icon } from '@/components/ui/icon';
import { ApiError, NETWORK_ERROR_MESSAGE, SCHEMA_ERROR_MESSAGE, errorKind, getApiErrorMessage } from '@/lib/api';
/**
 * Shared error display component for consistent error UI across all pages.
 *
 * Usage:
 *   <ErrorDisplay error={error} />
 *   <ErrorDisplay error={error} title="Idee nicht gefunden" onRetry={() => refetch()} />
 *   <ErrorDisplay error={error} variant="inline" />
 */

interface ErrorDisplayProps {
  /** The error object (from TanStack Query or any Error) */
  error: Error | null | undefined;
  /** Custom title (defaults to generic message based on error) */
  title?: string;
  /** Custom description */
  description?: string;
  /** Retry callback — shows "Erneut versuchen" button */
  onRetry?: () => void;
  /** Navigate-back callback — shows back button */
  onBack?: () => void;
  /** Label for the back button */
  backLabel?: string;
  /** Display variant */
  variant?: 'full' | 'inline';
  /** Material Symbol icon name */
  icon?: string;
}

function getErrorInfo(error: Error | null | undefined): {
  title: string;
  description: string;
  icon: string;
} {
  const kind = errorKind(error);
  // ApiError messages are German detail texts; the status decides the title.
  const status = error instanceof ApiError ? error.status : null;

  if (kind === 'network') {
    return { title: 'Keine Verbindung', description: NETWORK_ERROR_MESSAGE, icon: 'wifi_off' };
  }
  if (status === 404) {
    return {
      title: 'Nicht gefunden',
      description: 'Die angeforderte Seite existiert nicht oder wurde entfernt.',
      icon: 'search_off',
    };
  }
  if (status === 401 || status === 403) {
    return {
      title: 'Keine Berechtigung',
      description: 'Du hast keinen Zugriff auf diese Seite. Bitte melde dich an.',
      icon: 'lock',
    };
  }
  if (kind === 'schema') {
    return { title: 'Daten konnten nicht gelesen werden', description: SCHEMA_ERROR_MESSAGE, icon: 'error' };
  }
  if (status !== null && status >= 500) {
    return {
      title: 'Serverfehler',
      description: 'Auf dem Server ist ein Fehler aufgetreten. Bitte versuche es gleich noch einmal.',
      icon: 'error',
    };
  }
  return {
    title: 'Daten konnten nicht geladen werden',
    description: getApiErrorMessage(error),
    icon: 'error',
  };
}

export default function ErrorDisplay({
  error,
  title,
  description,
  onRetry: onRetryProp,
  onBack,
   backLabel = 'Zurück',
  variant = 'full',
  icon,
}: ErrorDisplayProps) {
  const info = getErrorInfo(error);
  // Retrying a missing resource never helps.
  const isNotFound = error instanceof ApiError && error.status === 404;
  const onRetry = isNotFound ? undefined : onRetryProp;
  const displayTitle = title ?? info.title;
  const displayDescription = description ?? info.description;
  const displayIcon = icon ?? info.icon;

  if (variant === 'inline') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-danger-border bg-danger-soft">
        <Icon name={displayIcon} size={24} className="text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-destructive">{displayTitle}</p>
          <p className="text-caption text-muted-foreground mt-0.5">{displayDescription}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-1.5 text-body font-medium bg-card text-foreground shadow-card rounded-lg hover:bg-muted transition"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className="text-center py-12 px-4">
      <Icon name={displayIcon} size={48} className="text-muted-foreground mb-4 block" />
      <h2 className="text-section font-bold mb-2">{displayTitle}</h2>
      <p className="text-muted-foreground text-body mb-6 max-w-md mx-auto">
        {displayDescription}
      </p>
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-body hover:opacity-90 transition flex items-center gap-1.5"
          >
            <Icon name="refresh" size={20} />
            Erneut versuchen
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 border rounded-lg text-body hover:bg-muted transition"
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
