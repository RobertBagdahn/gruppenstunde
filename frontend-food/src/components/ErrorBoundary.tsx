import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="bg-card rounded-xl border p-6 max-w-md w-full text-center space-y-4">
            <Icon name="error" size={24} className="text-destructive" />
            <h1 className="text-section font-semibold">Ein Fehler ist aufgetreten</h1>
            <p className="text-body text-muted-foreground">
              Die Anwendung konnte nicht geladen werden. Bitte lade die Seite neu.
            </p>
            <pre className="text-caption text-left bg-muted p-3 rounded-lg overflow-auto max-h-32 text-muted-foreground">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-body font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
