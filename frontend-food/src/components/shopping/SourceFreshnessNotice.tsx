import { RefreshCw, TriangleAlert } from 'lucide-react';
import type { ShoppingListSourceStatus } from '@/schemas/shoppingList';
import { cn } from '@/lib/utils';

interface SourceFreshnessNoticeProps {
  status: ShoppingListSourceStatus | null;
  /** Creates a new list from the current plan; omitted when the user cannot do that. */
  onCreateNew?: () => void;
  pending?: boolean;
  className?: string;
}

/** Snapshot hint of a plan-based shopping list: the plan changed after the list was created, or is gone. */
export default function SourceFreshnessNotice({ status, onCreateNew, pending = false, className }: SourceFreshnessNoticeProps) {
  if (status !== 'changed' && status !== 'deleted') return null;
  const changed = status === 'changed';
  return (
    <div
      role="status"
      data-testid="source-freshness-notice"
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-warning-border bg-warning-soft px-3 py-2 text-caption text-warning sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="flex min-w-0 items-start gap-2 font-medium">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="break-words">
          {changed ? 'Essensplan wurde seit Erstellung geändert' : 'Der Essensplan wurde gelöscht.'}
        </span>
      </p>
      {changed && onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          disabled={pending}
          className="press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-caption font-semibold text-foreground shadow-soft hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} aria-hidden="true" />
          Neue Liste erstellen
        </button>
      )}
    </div>
  );
}
