import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { ShoppingListSourceStatus } from '@/schemas/shoppingList';
import { cn } from '@/lib/utils';
import PlanDiffDialog from './trips/PlanDiffDialog';

interface SourceFreshnessNoticeProps {
  status: ShoppingListSourceStatus | null;
  /** The list is a trip of an event (its source is the event, not a single plan). */
  isEventTrip?: boolean;
  /** Event trips: opens the difference to the plan. Old plan lists have no difference to show. */
  diffListId?: number;
  eventSlug?: string | null;
  /** Event team only: take the changes over into the open entries. */
  canApply?: boolean;
  className?: string;
}

/** Snapshot hint of a plan-based shopping list: the plan changed after the list was created, or is gone. */
export default function SourceFreshnessNotice({
  status,
  isEventTrip = false,
  diffListId,
  eventSlug = null,
  canApply = false,
  className,
}: SourceFreshnessNoticeProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  if (status !== 'changed' && status !== 'deleted') return null;
  const changed = status === 'changed';
  const showDiff = changed && isEventTrip && diffListId !== undefined;
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
          {changed
            ? 'Essensplan wurde seit Erstellung geändert'
            : isEventTrip
              ? 'Das Event wurde gelöscht.'
              : 'Der Essensplan wurde gelöscht.'}
        </span>
      </p>
      {showDiff && (
        <>
          <button
            type="button"
            onClick={() => setDiffOpen(true)}
            className="press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-caption font-semibold text-foreground shadow-soft hover:bg-muted"
          >
            Änderungen ansehen
          </button>
          <PlanDiffDialog listId={diffListId} eventSlug={eventSlug} open={diffOpen} onOpenChange={setDiffOpen} canApply={canApply} />
        </>
      )}
    </div>
  );
}
