/**
 * TimelineTab — Chronological list of event activity with URL-driven filters
 * and action-type icons.
 *
 * Filters are URL-driven via query parameters:
 * ?action-type=registered|...&date-from=...&date-to=...
 */
import { useMemo } from 'react';
import type { EventDetail } from '@/schemas/event';
import { useEventTimeline } from '@/api/eventDashboard';
import { cn } from '@/lib/utils';
import { useFilterParams, type FilterField } from './FilterBar';

interface Props {
  event: EventDetail;
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  registered: { icon: 'person_add', color: 'text-emerald-600 bg-emerald-50', label: 'Angemeldet' },
  unregistered: { icon: 'person_remove', color: 'text-red-600 bg-red-50', label: 'Abgemeldet' },
  payment_received: { icon: 'payments', color: 'text-emerald-600 bg-emerald-50', label: 'Zahlung erhalten' },
  payment_removed: { icon: 'money_off', color: 'text-red-600 bg-red-50', label: 'Zahlung gelöscht' },
  booking_changed: { icon: 'swap_horiz', color: 'text-blue-600 bg-blue-50', label: 'Buchung geändert' },
  label_added: { icon: 'label', color: 'text-violet-600 bg-violet-50', label: 'Label hinzugefügt' },
  label_removed: { icon: 'label_off', color: 'text-amber-600 bg-amber-50', label: 'Label entfernt' },
  custom_field_updated: { icon: 'edit_note', color: 'text-blue-600 bg-blue-50', label: 'Feld aktualisiert' },
  mail_sent: { icon: 'mail', color: 'text-violet-600 bg-violet-50', label: 'E-Mail gesendet' },
  participant_updated: { icon: 'edit', color: 'text-blue-600 bg-blue-50', label: 'Teilnehmer aktualisiert' },
  attendance_check_in: { icon: 'login', color: 'text-emerald-600 bg-emerald-50', label: 'Check-in' },
  attendance_check_out: { icon: 'logout', color: 'text-amber-600 bg-amber-50', label: 'Check-out' },
  participants_imported: { icon: 'upload_file', color: 'text-blue-600 bg-blue-50', label: 'Import' },
};

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Alle Aktionen' },
  { value: 'registered', label: 'Anmeldungen' },
  { value: 'unregistered', label: 'Abmeldungen' },
  { value: 'payment_received', label: 'Zahlungen erhalten' },
  { value: 'payment_removed', label: 'Zahlungen gelöscht' },
  { value: 'label_added', label: 'Labels hinzugefügt' },
  { value: 'label_removed', label: 'Labels entfernt' },
  { value: 'participant_updated', label: 'Teilnehmer aktualisiert' },
  { value: 'attendance_check_in', label: 'Check-ins' },
  { value: 'attendance_check_out', label: 'Check-outs' },
  { value: 'participants_imported', label: 'Importe' },
];

const FILTER_FIELDS: FilterField[] = [
  {
    param: 'action-type',
    label: 'Alle Aktionen',
    type: 'select',
    options: ACTION_FILTER_OPTIONS.filter((o) => o.value !== '').map((o) => ({
      value: o.value,
      label: o.label,
    })),
  },
  {
    param: 'date',
    label: 'Zeitraum',
    type: 'date-range',
  },
];

export default function TimelineTab({ event }: Props) {
  const { getValue, getDateRange, setValue, setDateRange, activeCount, clearAll } =
    useFilterParams(FILTER_FIELDS);

  const actionFilter = getValue('action-type');
  const dateRange = getDateRange('date');

  // Page is still local state since it resets on filter change
  const pageParam = getValue('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const setPage = (p: number) => setValue('page', p > 1 ? String(p) : '');

  const { data: timeline, isLoading } = useEventTimeline(event.slug, {
    action_type: actionFilter || undefined,
    page,
  });

  const entries = timeline ?? [];

  // Client-side date filtering (since API may not support date range)
  const filteredEntries = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return entries;
    return entries.filter((entry) => {
      const entryDate = new Date(entry.created_at).toISOString().slice(0, 10);
      if (dateRange.from && entryDate < dateRange.from) return false;
      if (dateRange.to && entryDate > dateRange.to) return false;
      return true;
    });
  }, [entries, dateRange]);

  return (
    <div className="space-y-4">
      {/* Filters (URL-driven) */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={actionFilter}
          onChange={(e) => {
            setValue('action-type', e.target.value);
            setPage(1);
          }}
          className={cn(
            'text-sm border rounded-lg px-3 py-2 bg-background',
            actionFilter && 'border-violet-300 bg-violet-50/50',
          )}
        >
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground shrink-0">Zeitraum:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange('date', e.target.value, dateRange.to)}
            className={cn(
              'text-sm border rounded-lg px-2 py-1.5 bg-background w-32',
              dateRange.from && 'border-violet-300 bg-violet-50/50',
            )}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange('date', dateRange.from, e.target.value)}
            className={cn(
              'text-sm border rounded-lg px-2 py-1.5 bg-background w-32',
              dateRange.to && 'border-violet-300 bg-violet-50/50',
            )}
          />
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
            Zurücksetzen
          </button>
        )}
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
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">
            timeline
          </span>
          {actionFilter || dateRange.from || dateRange.to
            ? 'Keine Einträge für diesen Filter'
            : 'Noch keine Aktivitäten'}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

          <div className="space-y-0">
            {filteredEntries.map((entry, idx) => {
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
                  ? new Date(filteredEntries[idx - 1].created_at).toLocaleDateString(
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

      {/* Pagination */}
      {filteredEntries.length > 0 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(Math.max(1, page - 1))}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Zurück
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Seite {page}
          </span>
          <button
            disabled={entries.length < 20}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
