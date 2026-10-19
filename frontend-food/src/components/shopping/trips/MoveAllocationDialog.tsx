import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { formatTripTime } from '@/lib/tripTime';
import type { AllocationRuleInput, PlannedTrip, TripRow } from '@/schemas/shoppingTrip';
import { formatBaseAmount, formatRowQuantity } from './tripFormat';

interface MoveAllocationDialogProps {
  row: TripRow | null;
  source: PlannedTrip | null;
  /** Planned trips of the event; the source is filtered out. */
  trips: PlannedTrip[];
  pending?: boolean;
  error?: unknown;
  onClose: () => void;
  onSubmit: (input: AllocationRuleInput) => void;
}

export default function MoveAllocationDialog(props: MoveAllocationDialogProps) {
  const { row, source, onClose } = props;
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">{row && source && <MoveForm {...props} row={row} source={source} />}</DialogContent>
    </Dialog>
  );
}

function MoveForm({
  row,
  source,
  trips,
  pending = false,
  error,
  onClose,
  onSubmit,
}: MoveAllocationDialogProps & { row: TripRow; source: PlannedTrip }) {
  const targets = trips.filter((trip) => trip.status === 'planned' && trip.list_id !== source.list_id);
  const meals = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of row.sources) {
      if (item.meal_id !== null) byId.set(item.meal_id, item.meal_label);
    }
    return [...byId.entries()].map(([id, label]) => ({ id, label }));
  }, [row.sources]);

  const [targetId, setTargetId] = useState<number | null>(targets[0]?.list_id ?? null);
  const [scope, setScope] = useState<'all' | 'meal'>('all');
  const [mealId, setMealId] = useState<number | null>(meals[0]?.id ?? null);
  const [part, setPart] = useState<'whole' | 'part'>('whole');
  const [amount, setAmount] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const baseUnit = row.kind === 'material' ? 'Stück' : 'g';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (targetId === null) {
      setProblem('Bitte wähle einen Einkauf aus.');
      return;
    }
    const quantity = part === 'part' ? Number(amount.replace(',', '.')) : null;
    if (part === 'part' && !(quantity !== null && quantity > 0)) {
      setProblem(`Bitte gib eine Menge in ${baseUnit === 'g' ? 'Gramm' : 'Stück'} an.`);
      return;
    }
    setProblem(null);
    onSubmit({
      target_id: targetId,
      ingredient_id: row.kind === 'ingredient' ? row.subject_id : null,
      material_id: row.kind === 'material' ? row.subject_id : null,
      meal_id: scope === 'meal' ? mealId : null,
      quantity,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{row.name} verschieben</DialogTitle>
        <DialogDescription>
          Aktuell in „{source.name}“: {formatRowQuantity(row)}. Die Zuordnung bleibt auch bei Planänderungen bestehen.
        </DialogDescription>
      </DialogHeader>

      {targets.length === 0 ? (
        <p className="text-body text-muted-foreground">Es gibt keinen anderen geplanten Einkauf. Lege zuerst einen weiteren Einkauf an.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="move-target">Verschieben nach</Label>
            <select
              id="move-target"
              value={targetId ?? ''}
              onChange={(e) => setTargetId(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-body"
            >
              {targets.map((trip) => (
                <option key={trip.list_id} value={trip.list_id}>
                  {trip.name}
                  {trip.scheduled_at ? ` (${formatTripTime(trip.scheduled_at)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-body font-semibold">Für welche Mahlzeiten?</legend>
            <label className="flex items-center gap-2 text-body">
              <input type="radio" name="move-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
              Alle Mahlzeiten
            </label>
            <label className="flex items-center gap-2 text-body">
              <input type="radio" name="move-scope" checked={scope === 'meal'} onChange={() => setScope('meal')} disabled={meals.length === 0} />
              Nur eine Mahlzeit
            </label>
            {scope === 'meal' && (
              <select
                aria-label="Mahlzeit"
                value={mealId ?? ''}
                onChange={(e) => setMealId(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-body"
              >
                {meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.label}
                  </option>
                ))}
              </select>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-body font-semibold">Wie viel?</legend>
            <label className="flex items-center gap-2 text-body">
              <input type="radio" name="move-part" checked={part === 'whole'} onChange={() => setPart('whole')} />
              Ganze Menge ({formatBaseAmount(row.kind === 'material' ? row.quantity : row.total_quantity_g, baseUnit)})
            </label>
            <label className="flex items-center gap-2 text-body">
              <input type="radio" name="move-part" checked={part === 'part'} onChange={() => setPart('part')} />
              Teilmenge
            </label>
            {part === 'part' && (
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Menge in ${baseUnit === 'g' ? 'Gramm' : 'Stück'}`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="max-w-32"
                />
                <span className="text-body text-muted-foreground">{baseUnit === 'g' ? 'g' : 'Stück'}</span>
              </div>
            )}
          </fieldset>
        </>
      )}

      {(problem || (error !== undefined && error !== null)) && (
        <p role="alert" className="text-body text-danger">
          {problem ?? getApiErrorMessage(error)}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={pending || targets.length === 0}>
          Verschieben
        </Button>
      </DialogFooter>
    </form>
  );
}
