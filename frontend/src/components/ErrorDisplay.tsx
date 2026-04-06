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
  const message = error?.message ?? '';

  if (message.includes('404') || message.includes('Not Found')) {
    return {
      title: 'Nicht gefunden',
      description: 'Die angeforderte Ressource existiert nicht oder wurde entfernt.',
      icon: 'search_off',
    };
  }

  if (message.includes('403') || message.includes('Forbidden')) {
    return {
      title: 'Keine Berechtigung',
      description: 'Du hast keinen Zugriff auf diese Ressource. Bitte melde dich an.',
      icon: 'lock',
    };
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return {
      title: 'Keine Verbindung',
      description: 'Keine Internetverbindung. Bitte pruefe deine Verbindung.',
      icon: 'wifi_off',
    };
  }

  if (message.includes('500') || message.includes('Internal Server Error')) {
    return {
      title: 'Serverfehler',
      description:
        'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es spaeter erneut.',
      icon: 'error',
    };
  }

  return {
    title: 'Fehler beim Laden',
    description: message || 'Ein unerwarteter Fehler ist aufgetreten.',
    icon: 'error',
  };
}

export default function ErrorDisplay({
  error,
  title,
  description,
  onRetry,
  onBack,
  backLabel = 'Zurueck',
  variant = 'full',
  icon,
}: ErrorDisplayProps) {
  const info = getErrorInfo(error);
  const displayTitle = title ?? info.title;
  const displayDescription = description ?? info.description;
  const displayIcon = icon ?? info.icon;

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
        <span className="material-symbols-outlined text-2xl text-destructive shrink-0">
          {displayIcon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{displayTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{displayDescription}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-4">
      <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
        {displayIcon}
      </span>
      <h2 className="text-xl font-bold mb-2">{displayTitle}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
        {displayDescription}
      </p>
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Erneut versuchen
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
