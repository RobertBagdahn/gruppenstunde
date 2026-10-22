import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowHeaderProps {
  /** Visible title of the flow, also the page's H1. */
  title: ReactNode;
  /** Shows a close button when given: leaves the flow (food-page-shell). */
  onClose?: () => void;
  closeLabel?: string;
  /** Progress text, e.g. "Schritt 4 von 7". */
  progress?: string;
  /** 0–100 for the progress bar under the header. */
  progressValue?: number;
  className?: string;
}

/** Header of a multi-step flow (wizard, cooking mode): close, title, progress. */
export default function FlowHeader({ title, onClose, closeLabel = 'Schließen', progress, progressValue, className }: FlowHeaderProps) {
  return (
    <header className={cn('sticky top-0 z-40 border-b border-line bg-background', className)}>
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-section font-bold text-foreground">{title}</h1>
        {progress && <span className="shrink-0 text-body font-semibold tabular-nums text-muted-foreground">{progress}</span>}
      </div>
      {progressValue !== undefined && (
        <div
          role="progressbar"
          aria-label="Fortschritt"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressValue)}
          className="h-1 bg-muted"
        >
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }} />
        </div>
      )}
    </header>
  );
}
