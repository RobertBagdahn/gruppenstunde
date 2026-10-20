import { useState, type FormEvent } from 'react';

import { useAddEvent, useEvents } from '@/api/queries';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { SampleBadge } from '@/components/shared/SampleBadge';

type EventRow = { id: string; date: string; kind: string; title: string; sku: string | null; source: 'kalender' | 'beispiel' | 'journal'; is_sample: boolean };

const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
const dayFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });

/** Event timeline by month: fixed calendar markers, example events marked as sample, events added by people (journal). */
export function EventsPage() {
  const [year] = useState(() => new Date().getFullYear());
  const query = useEvents({ start: `${year}-01-01`, end: `${year}-12-31` });
  const months = groupByMonth(query.data ?? []);

  return (
    <Page area="Daten" page="Ereignisse">
      <div className="grid gap-6 p-6 min-[960px]:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <QueryState error={query.error} isLoading={query.isLoading}>
          <div className="flex flex-col gap-5">
            {months.map(([label, events]) => (
              <section key={label} aria-label={label} className="flex flex-col gap-1">
                <h2 className="m-0 text-label uppercase text-muted-foreground">{label}</h2>
                {events.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 border-b border-border-row py-2 text-dense">
                    <span className="w-14 font-mono text-caption text-muted-foreground">{dayFormat.format(new Date(`${e.date}T12:00:00Z`))}</span>
                    <span className="text-foreground-strong">{e.title}</span>
                    {e.sku && <span className="font-mono text-caption text-muted-foreground">{e.sku}</span>}
                    <span className="text-caption text-muted-foreground">{e.kind}</span>
                    {e.is_sample && <SampleBadge />}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </QueryState>
        <AddEvent />
      </div>
    </Page>
  );
}

function AddEvent() {
  const add = useAddEvent();
  const [date, setDate] = useState('');
  const [kind, setKind] = useState('Aktion');
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate({ date, kind, title, sku: sku || null }, { onSuccess: () => setTitle('') });
  };
  return (
    <form onSubmit={submit} aria-label="Ereignis hinzufügen" className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 text-dense">
      <h2 className="m-0 text-label uppercase text-muted-foreground">Ereignis hinzufügen</h2>
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Datum
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-md border border-border-strong bg-background px-2 text-foreground" />
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Art
        <input required value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 rounded-md border border-border-strong bg-background px-2 text-foreground" />
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Bezeichnung
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 rounded-md border border-border-strong bg-background px-2 text-foreground" />
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Artikel (optional)
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="h-8 rounded-md border border-border-strong bg-background px-2 font-mono text-foreground" />
      </label>
      <button type="submit" disabled={add.isPending} className="h-8 rounded-md bg-accent px-3 font-semibold text-accent-foreground disabled:opacity-40">
        Speichern
      </button>
      {add.error && <p role="alert" className="m-0 text-warning-text">{add.error.message}</p>}
    </form>
  );
}

function groupByMonth(events: EventRow[]): [string, EventRow[]][] {
  const groups = new Map<string, EventRow[]>();
  for (const e of events) {
    const label = monthFormat.format(new Date(`${e.date}T12:00:00Z`));
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }
  return [...groups.entries()];
}
