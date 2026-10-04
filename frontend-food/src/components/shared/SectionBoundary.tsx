/**
 * Error boundaries below the app root (food-error-presentation spec).
 *
 * - `SectionBoundary`: a render error replaces only this section.
 * - `RouteBoundary`: a render error replaces the page content while the
 *   navigation stays usable; it resets when the path changes.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface BoundaryProps {
  children: ReactNode;
  /** Changing this value clears a caught error. */
  resetKey?: string;
  fallback: (reset: () => void) => ReactNode;
}

interface BoundaryState {
  error: Error | null;
  resetKey?: string;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by boundary:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.reset);
    return this.props.children;
  }
}

export default function SectionBoundary({ children, title = 'Dieser Bereich konnte nicht angezeigt werden' }: { children: ReactNode; title?: string }) {
  return (
    <Boundary
      fallback={(reset) => (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-danger-border bg-danger-soft p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="flex-1 text-body text-danger">{title}</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-body font-medium text-foreground shadow-card hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </button>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}

export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <Boundary
      resetKey={pathname}
      fallback={() => (
        <div role="alert" className="container max-w-xl py-16 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-danger" aria-hidden="true" />
          <h1 className="text-section font-bold">Diese Seite konnte nicht angezeigt werden</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Beim Anzeigen ist ein Fehler aufgetreten. Lade die Seite neu oder gehe zurück.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-body font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Neu laden
          </button>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}
