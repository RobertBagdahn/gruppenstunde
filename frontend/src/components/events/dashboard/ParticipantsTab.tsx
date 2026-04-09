/**
 * ParticipantsTab — Filterable participant list with labels, payment status, and search.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import {
  useLabels,
} from '@/api/eventDashboard';
import { useRemoveParticipant } from '@/api/events';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

export default function ParticipantsTab({ event }: Props) {
  const [search, setSearch] = useState('');
  const [filterBookingOption, setFilterBookingOption] = useState<string>('');
  const [filterPaid, setFilterPaid] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: labels } = useLabels(event.slug);
  const removeParticipant = useRemoveParticipant(event.slug);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Get all participants from all registrations
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Client-side filtering
  const filtered = allParticipants.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !p.first_name.toLowerCase().includes(s) &&
        !p.last_name.toLowerCase().includes(s) &&
        !p.email.toLowerCase().includes(s) &&
        !p.scout_name.toLowerCase().includes(s)
      )
        return false;
    }
    if (filterBookingOption && String(p.booking_option_id) !== filterBookingOption) return false;
    if (filterPaid === 'paid' && !p.is_paid) return false;
    if (filterPaid === 'unpaid' && p.is_paid) return false;
    if (filterLabel && !p.labels.some((l) => String(l.id) === filterLabel)) return false;
    return true;
  });

  const handleDelete = (participantId: number) => {
    removeParticipant.mutate(participantId, {
      onSuccess: () => {
        toast.success('Teilnehmer entfernt');
        setConfirmDelete(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined text-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            search
          </span>
          <input
            type="text"
            placeholder="Name, E-Mail, Pfadfindername..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background"
          />
        </div>
        <select
          value={filterBookingOption}
          onChange={(e) => setFilterBookingOption(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-background"
        >
          <option value="">Alle Optionen</option>
          {event.booking_options.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
              {opt.name}
            </option>
          ))}
        </select>
        <select
          value={filterPaid}
          onChange={(e) => setFilterPaid(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-background"
        >
          <option value="">Bezahlt-Status</option>
          <option value="paid">Bezahlt</option>
          <option value="unpaid">Ausstehend</option>
        </select>
        {labels && labels.length > 0 && (
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-background"
          >
            <option value="">Alle Labels</option>
            {labels.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} von {allParticipants.length} Teilnehmern
      </p>

      {/* Participant List */}
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.first_name} {p.last_name}
                      {p.scout_name && (
                        <span className="text-muted-foreground ml-1">({p.scout_name})</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.booking_option_name || 'Keine Buchungsoption'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Labels (show max 2 on mobile) */}
                  <div className="hidden sm:flex items-center gap-1">
                    {p.labels.map((l) => (
                      <span
                        key={l.id}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex sm:hidden items-center gap-1">
                    {p.labels.slice(0, 2).map((l) => (
                      <span
                        key={l.id}
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: l.color }}
                        title={l.name}
                      />
                    ))}
                    {p.labels.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{p.labels.length - 2}</span>
                    )}
                  </div>
                  {/* Payment status */}
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      p.is_paid ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {p.is_paid ? 'check_circle' : 'pending'}
                    </span>
                    <span className="hidden sm:inline">{p.is_paid ? 'Bezahlt' : 'Offen'}</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                    {expandedId === p.id ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedId === p.id && (
              <div className="px-3 pb-3 border-t pt-3 text-sm space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Detail label="E-Mail" value={p.email} />
                  <Detail label="Adresse" value={`${p.address} ${p.zip_code} ${p.city}`.trim()} />
                  <Detail label="Geburtstag" value={p.birthday ? new Date(p.birthday).toLocaleDateString('de-DE') : '–'} />
                  <Detail label="Geschlecht" value={p.gender} />
                  <Detail label="Bezahlt" value={`${p.total_paid}€ / ${(parseFloat(p.total_paid) + parseFloat(p.remaining_amount)).toFixed(2)}€`} />
                </div>

                {/* Custom Field Values */}
                {p.custom_field_values.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Benutzerdefinierte Felder
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {p.custom_field_values.map((cfv) => (
                        <Detail
                          key={cfv.custom_field_id}
                          label={cfv.custom_field_label}
                          value={cfv.value || '–'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Entfernen
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <span className="material-symbols-outlined text-3xl mb-2 block">person_off</span>
            {allParticipants.length === 0
              ? 'Noch keine Teilnehmer angemeldet'
              : 'Keine Teilnehmer gefunden'}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        title="Teilnehmer entfernen?"
        description="Der Teilnehmer wird unwiderruflich aus dem Event entfernt."
        confirmLabel="Entfernen"
        loading={removeParticipant.isPending}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '–'}</p>
    </div>
  );
}
