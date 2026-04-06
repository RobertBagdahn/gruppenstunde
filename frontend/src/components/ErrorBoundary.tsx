/**
 * React Error Boundary — catches unhandled rendering errors and shows a fallback UI.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={<MyCustomFallback />}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. If not provided, uses default crash screen. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in dev; in production this is where Sentry would go
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4 block">
              warning
            </span>
            <h1 className="text-2xl font-bold mb-2">Etwas ist schiefgelaufen</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium mb-1">
                  Technische Details
                </summary>
                <pre className="whitespace-pre-wrap break-all mt-2">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Seite neu laden
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
