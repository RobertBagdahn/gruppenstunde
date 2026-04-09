/**
 * TimelineTab — Chronological list of event activity with filters and action-type icons.
 */
import { useState } from 'react';
import type { EventDetail } from '@/schemas/event';
import { useEventTimeline } from '@/api/eventDashboard';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  registered: { icon: 'person_add', color: 'text-emerald-600 bg-emerald-50', label: 'Angemeldet' },
  unregistered: { icon: 'person_remove', color: 'text-red-600 bg-red-50', label: 'Abgemeldet' },
  payment_received: { icon: 'payments', color: 'text-emerald-600 bg-emerald-50', label: 'Zahlung erhalten' },
  payment_removed: { icon: 'money_off', color: 'text-red-600 bg-red-50', label: 'Zahlung geloescht' },
  booking_changed: { icon: 'swap_horiz', color: 'text-blue-600 bg-blue-50', label: 'Buchung geaendert' },
  label_added: { icon: 'label', color: 'text-violet-600 bg-violet-50', label: 'Label hinzugefuegt' },
  label_removed: { icon: 'label_off', color: 'text-amber-600 bg-amber-50', label: 'Label entfernt' },
  custom_field_updated: { icon: 'edit_note', color: 'text-blue-600 bg-blue-50', label: 'Feld aktualisiert' },
  mail_sent: { icon: 'mail', color: 'text-violet-600 bg-violet-50', label: 'E-Mail gesendet' },
  participant_updated: { icon: 'edit', color: 'text-blue-600 bg-blue-50', label: 'Teilnehmer aktualisiert' },
};

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Alle Aktionen' },
  { value: 'registered', label: 'Anmeldungen' },
  { value: 'unregistered', label: 'Abmeldungen' },
  { value: 'payment_received', label: 'Zahlungen erhalten' },
  { value: 'payment_removed', label: 'Zahlungen geloescht' },
  { value: 'label_added', label: 'Labels hinzugefuegt' },
  { value: 'label_removed', label: 'Labels entfernt' },
  { value: 'participant_updated', label: 'Teilnehmer aktualisiert' },
];

export default function TimelineTab({ event }: Props) {
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: timeline, isLoading } = useEventTimeline(event.slug, {
    action_type: actionFilter || undefined,
    page,
  });

  const entries = timeline ?? [];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border rounded-lg px-3 py-2 bg-background"
        >
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">
            timeline
          </span>
          {actionFilter
            ? 'Keine Eintraege fuer diesen Filter'
            : 'Noch keine Aktivitaeten'}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

          <div className="space-y-0">
            {entries.map((entry, idx) => {
              const config = ACTION_CONFIG[entry.action_type] ?? {
                icon: 'info',
                color: 'text-muted-foreground bg-muted',
                label: entry.action_type_display,
              };

              // Group by date
              const entryDate = new Date(entry.created_at).toLocaleDateString(
                'de-DE',
                { day: '2-digit', month: 'long', year: 'numeric' },
              );
              const prevDate =
                idx > 0
                  ? new Date(entries[idx - 1].created_at).toLocaleDateString(
                      'de-DE',
                      { day: '2-digit', month: 'long', year: 'numeric' },
                    )
                  : null;
              const showDateHeader = entryDate !== prevDate;

              return (
                <div key={entry.id}>
                  {showDateHeader && (
                    <div className="relative pl-10 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        {entryDate}
                      </p>
                    </div>
                  )}
                  <div className="relative flex items-start gap-3 pl-0 py-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10',
                        config.color,
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {config.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm">
                        {entry.description || config.label}
                      </p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                        <span>
                          {new Date(entry.created_at).toLocaleTimeString(
                            'de-DE',
                            { hour: '2-digit', minute: '2-digit' },
                          )}
                        </span>
                        {entry.participant_name && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">
                              person
                            </span>
                            {entry.participant_name}
                          </span>
                        )}
                        {entry.user_email && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">
                              account_circle
                            </span>
                            {entry.user_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 mt-1',
                        config.color,
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination placeholder — timeline endpoint supports page param */}
      {entries.length > 0 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Zurueck
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Seite {page}
          </span>
          <button
            disabled={entries.length < 20}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
