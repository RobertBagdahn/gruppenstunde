import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { toLocalDateTime, toLocalFields } from '@/lib/tripTime';
import type { Store } from '@/schemas/shoppingStore';
import { TripInputSchema } from '@/schemas/shoppingTrip';
import StoreCombobox from './StoreCombobox';

export interface TripFormValues {
  store_id: number;
  scheduled_at: string;
  name?: string;
}

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSlug: string;
  /** Pre-fills the day (e.g. when adding from a day of the meal plan). */
  defaultDate?: string;
  /** Edit mode: the trip's current shop and time. */
  initial?: { store: Pick<Store, 'id' | 'name'> | null; scheduledAt: string | null; name?: string };
  pending?: boolean;
  error?: unknown;
  onSubmit: (values: TripFormValues) => void;
}

export default function TripFormDialog(props: TripFormDialogProps) {
  // The form remounts per opening so it never shows stale input
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">{props.open && <TripForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function TripForm({ onOpenChange, eventSlug, defaultDate, initial, pending = false, error, onSubmit }: TripFormDialogProps) {
  const editing = initial !== undefined;
  const fields = toLocalFields(initial?.scheduledAt ?? null);
  const [store, setStore] = useState<Pick<Store, 'id' | 'name'> | null>(initial?.store ?? null);
  const [date, setDate] = useState(fields.date || defaultDate || '');
  const [time, setTime] = useState(fields.time);
  const [name, setName] = useState(initial?.name ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = TripInputSchema.safeParse({
      store_id: store?.id,
      scheduled_at: toLocalDateTime(date, time),
      name: name.trim() || undefined,
    });
    if (!parsed.success) {
      setProblem(parsed.error.issues[0].message);
      return;
    }
    setProblem(null);
    onSubmit({ store_id: parsed.data.store_id, scheduled_at: parsed.data.scheduled_at, name: parsed.data.name });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? 'Einkauf ändern' : 'Einkauf hinzufügen'}</DialogTitle>
        <DialogDescription>Wähle den Laden und wann eingekauft wird. Der Bedarf wird danach nach Datum verteilt.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="trip-store">Laden</Label>
        <StoreCombobox id="trip-store" value={store} onChange={setStore} eventSlug={eventSlug} invalid={problem !== null && store === null} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trip-date">Datum</Label>
          <Input id="trip-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trip-time">Uhrzeit</Label>
          <Input id="trip-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      {editing && (
        <div className="space-y-1.5">
          <Label htmlFor="trip-name">Name</Label>
          <Input id="trip-name" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
        </div>
      )}

      {(problem || (error !== undefined && error !== null)) && (
        <p role="alert" className="text-body text-danger">
          {problem ?? getApiErrorMessage(error)}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={pending}>
          {editing ? 'Speichern' : 'Hinzufügen'}
        </Button>
      </DialogFooter>
    </form>
  );
}
