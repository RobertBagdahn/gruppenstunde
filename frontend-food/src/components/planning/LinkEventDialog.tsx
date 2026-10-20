import { useState } from 'react';
import { useCreateEventForMealPlan, useLinkMealPlanEvent, useManageableEvents } from '@/api/shoppingTrips';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { formatDateRange, toLocalFields } from '@/lib/tripTime';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

export interface LinkEventPlan {
  id: number;
  name: string;
  start_datetime: string | null;
  end_datetime: string | null;
}

interface LinkEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: LinkEventPlan;
  /** Called with the slug of the event the plan now belongs to. */
  onLinked: (eventSlug: string) => void;
}

export default function LinkEventDialog(props: LinkEventDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">{props.open && <LinkEventForm {...props} />}</DialogContent>
    </Dialog>
  );
}

/** Keeps the plan's own time of day when the user only moves the date. */
function withDate(original: string | null, date: string): string | null {
  if (!date) return null;
  const { date: originalDate, time } = toLocalFields(original);
  if (original && date === originalDate) return original;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

function LinkEventForm({ onOpenChange, plan, onLinked }: LinkEventDialogProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const events = useManageableEvents(search.trim(), page, 6);
  const link = useLinkMealPlanEvent(plan.id);
  const create = useCreateEventForMealPlan(plan.id);

  const hasEvents = (events.data?.total ?? 0) > 0 || search.trim() !== '';
  const [mode, setMode] = useState<'choose' | 'create'>('choose');
  const showCreate = mode === 'create' || (!events.isPending && !hasEvents);

  const [name, setName] = useState(plan.name);
  const [startDate, setStartDate] = useState(toLocalFields(plan.start_datetime).date);
  const [endDate, setEndDate] = useState(toLocalFields(plan.end_datetime).date);

  const done = (slug: string) => {
    notify.success('Essensplan verknüpft');
    onOpenChange(false);
    onLinked(slug);
  };

  const pick = (slug: string, id: number) => {
    link.mutate(id, { onSuccess: () => done(slug) });
  };

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), start_date: withDate(plan.start_datetime, startDate), end_date: withDate(plan.end_datetime, endDate) },
      { onSuccess: (created) => done(created.slug) },
    );
  };

  const error = link.error ?? create.error;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Event verknüpfen</DialogTitle>
        <DialogDescription>Für Einkäufe braucht der Plan „{plan.name}“ ein Event.</DialogDescription>
      </DialogHeader>

      {!showCreate ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-event-search">Event suchen</Label>
            <Input
              id="link-event-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name des Events"
            />
          </div>
          {events.isPending ? (
            <p role="status" className="text-body text-muted-foreground">Events werden geladen…</p>
          ) : events.data && events.data.items.length === 0 ? (
            <p className="text-body text-muted-foreground">Kein passendes Event gefunden.</p>
          ) : (
            <ul className="space-y-1" aria-label="Deine Events">
              {events.data?.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={link.isPending}
                    onClick={() => pick(item.slug, item.id)}
                    className={cn('w-full rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50')}
                  >
                    <span className="block truncate text-body font-semibold">{item.name}</span>
                    <span className="block text-caption text-muted-foreground">{formatDateRange(item.start_date, item.end_date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(events.data?.total_pages ?? 1) > page && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPage(page + 1)}>
              Mehr laden
            </Button>
          )}
          {!events.isPending && (
            <Button type="button" variant="secondary" onClick={() => setMode('create')}>
              Neues Event anlegen
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={submitCreate} className="space-y-3" aria-label="Neues Event anlegen">
          <div className="space-y-1.5">
            <Label htmlFor="new-event-name">Name</Label>
            <Input id="new-event-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-event-start">Beginn</Label>
              <Input id="new-event-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-event-end">Ende</Label>
              <Input id="new-event-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-caption text-muted-foreground">Das Event ist nicht öffentlich. Du wirst als verantwortliche Person eingetragen.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            {hasEvents && (
              <Button type="button" variant="outline" onClick={() => setMode('choose')}>
                Zurück
              </Button>
            )}
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Event anlegen
            </Button>
          </DialogFooter>
        </form>
      )}

      {error !== null && error !== undefined && (
        <p role="alert" className="text-body text-danger">
          {getApiErrorMessage(error)}
        </p>
      )}
    </div>
  );
}
