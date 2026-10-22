import { usePlanDiff, useApplyPlanDiff } from '@/api/shoppingTrips';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { TripDiffRow } from '@/schemas/shoppingTrip';
import { formatBaseAmount } from './tripFormat';

interface PlanDiffDialogProps {
  listId: number;
  eventSlug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only the event team may take the changes over. */
  canApply: boolean;
}

/** One line per differing ingredient, e.g. "+1 kg Nudeln – bereits gekauft: 2 kg". */
export function describeDiffRow(row: TripDiffRow): string {
  const amount = (value: number) => formatBaseAmount(value, row.unit);
  const bought = row.snapshot_checked;
  if (row.kind === 'new') return `Neu: ${row.name} ${amount(row.current)}`;
  if (row.kind === 'removed') {
    return bought > 0 ? `Entfällt: ${row.name} – bereits gekauft: ${amount(bought)}` : `Entfällt: ${row.name} (${amount(row.snapshot_open)})`;
  }
  const delta = row.current - (row.snapshot_open + bought);
  if (bought > 0 && delta > 0) return `+${amount(delta)} ${row.name} – bereits gekauft: ${amount(bought)}`;
  return `${row.name}: ${amount(row.snapshot_open + bought)} → ${amount(row.current)}`;
}

export default function PlanDiffDialog({ listId, eventSlug, open, onOpenChange, canApply }: PlanDiffDialogProps) {
  const diff = usePlanDiff(listId, open);
  const apply = useApplyPlanDiff(eventSlug);

  const takeOver = () => {
    apply.mutate(listId, {
      onSuccess: () => {
        notify.success('Änderungen übernommen');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Änderungen im Essensplan</DialogTitle>
          <DialogDescription>
            Beim Übernehmen werden nur nicht abgehakte, aus dem Plan erzeugte Einträge angepasst. Abgehakte und selbst hinzugefügte Einträge bleiben.
          </DialogDescription>
        </DialogHeader>

        {diff.isPending ? (
          <p role="status" className="text-body text-muted-foreground">Änderungen werden geladen…</p>
        ) : diff.isError ? (
          <p role="alert" className="text-body text-danger">{getApiErrorMessage(diff.error)}</p>
        ) : diff.data.rows.length === 0 ? (
          <p className="text-body text-muted-foreground">Keine Änderungen.</p>
        ) : (
          <ul className="space-y-2" aria-label="Änderungen">
            {diff.data.rows.map((row) => (
              <li key={`${row.subject_kind}-${row.subject_id}`} className="break-words text-body">
                {describeDiffRow(row)}
              </li>
            ))}
          </ul>
        )}

        {apply.isError && (
          <p role="alert" className="text-body text-danger">{getApiErrorMessage(apply.error)}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          {canApply && (
            <Button type="button" onClick={takeOver} disabled={apply.isPending || !diff.data?.has_changes}>
              Änderungen übernehmen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
