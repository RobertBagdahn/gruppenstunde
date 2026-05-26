/**
 * ParticipantsTab — Filterable participant list with labels, payment status, search,
 * and admin registration dialog.
 *
 * All filters are URL-driven via query parameters:
 * ?search=...&booking-option=...&payment-status=paid|unpaid|partial&label=...
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import {
  useLabels,
  useWaitlist,
  useRemoveFromWaitlist,
} from '@/api/eventDashboard';
import { useRemoveParticipant, useAdminRegister, usePersons } from '@/api/events';
import { cn } from '@/lib/utils';
import FilterBar, { useFilterParams, type FilterField } from './FilterBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import AttendanceView from './AttendanceView';
import ImportDialog from './ImportDialog';
import RoomAssignmentView from './RoomAssignmentView';

interface Props {
  event: EventDetail;
}

export default function ParticipantsTab({ event }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAdminRegister, setShowAdminRegister] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: labels } = useLabels(event.slug);
  const removeParticipant = useRemoveParticipant(event.slug);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('cancel');

  // Build filter fields for the FilterBar
  const filterFields: FilterField[] = useMemo(() => {
    const fields: FilterField[] = [
      {
        param: 'search',
        label: 'Suche',
        type: 'search',
        placeholder: 'Name, E-Mail, Pfadfindername...',
      },
      {
        param: 'booking-option',
        label: 'Alle Optionen',
        type: 'select',
        options: event.booking_options.map((opt) => ({
          value: String(opt.id),
          label: `${opt.name}${!opt.is_bookable && !opt.is_system ? ' (abgelaufen)' : ''}`,
        })),
      },
      {
        param: 'payment-status',
        label: 'Bezahlt-Status',
        type: 'select',
        options: [
          { value: 'paid', label: 'Bezahlt' },
          { value: 'unpaid', label: 'Ausstehend' },
          { value: 'partial', label: 'Teilweise bezahlt' },
        ],
      },
    ];

    if (labels && labels.length > 0) {
      fields.push({
        param: 'label',
        label: 'Alle Labels',
        type: 'select',
        options: labels.map((l) => ({
          value: String(l.id),
          label: l.name,
        })),
      });
    }

    return fields;
  }, [event.booking_options, labels]);

  // Read filter values from URL
  const { getValue } = useFilterParams(filterFields);
  const search = getValue('search');
  const filterBookingOption = getValue('booking-option');
  const filterPaid = getValue('payment-status');
  const filterLabel = getValue('label');

  // Get all participants from all registrations
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Client-side filtering
  const filtered = useMemo(() => {
    return allParticipants.filter((p) => {
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
      if (filterPaid === 'partial') {
        const hasSomePayment = parseFloat(p.total_paid) > 0;
        if (p.is_paid || !hasSomePayment) return false;
      }
      if (filterLabel && !p.labels.some((l) => String(l.id) === filterLabel)) return false;
      return true;
    });
  }, [allParticipants, search, filterBookingOption, filterPaid, filterLabel]);

  const handleDelete = (participantId: number) => {
    removeParticipant.mutate(
      { participantId, reason: deleteReason },
      {
        onSuccess: () => {
          toast.success('Teilnehmer entfernt');
          setConfirmDelete(null);
          setDeleteReason('cancel');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Admin Actions */}
      {event.is_manager && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAdminRegister(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Teilnehmer hinzufügen
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Importieren
          </button>
        </div>
      )}

      {/* Attendance Section (visible during "running" phase or for managers) */}
      {event.is_manager && (event.phase === 'running' || event.phase === 'post') && (
        <AttendanceSection event={event} />
      )}

      {/* Room Assignment Section (manager only) */}
      {event.is_manager && (
        <RoomAssignmentSection event={event} />
      )}

      {/* Filters (URL-driven) */}
      <FilterBar
        fields={filterFields}
        totalCount={allParticipants.length}
        filteredCount={filtered.length}
        countLabel="Teilnehmern"
      />

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

      {/* Waitlist Section (manager only) */}
      {event.is_manager && <WaitlistAdminSection slug={event.slug} />}

      {/* Confirm Delete Dialog with Reason */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-semibold">Teilnehmer entfernen?</h3>
            <p className="text-sm text-muted-foreground">
              Der Teilnehmer wird aus dem Event entfernt (Soft-Delete).
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Grund
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
              >
                <option value="cancel">Stornierung</option>
                <option value="error">Fehler</option>
                <option value="duplicate">Duplikat</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteReason('cancel');
                }}
                disabled={removeParticipant.isPending}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Abbrechen
              </button>
              <button
                onClick={() => confirmDelete && handleDelete(confirmDelete)}
                disabled={removeParticipant.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50 flex items-center gap-1.5"
              >
                {removeParticipant.isPending && (
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                )}
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Registration Dialog */}
      {showAdminRegister && (
        <AdminRegisterDialog
          event={event}
          onClose={() => setShowAdminRegister(false)}
        />
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportDialog slug={event.slug} onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Assignment Section (collapsible, 23.5)
// ---------------------------------------------------------------------------

function RoomAssignmentSection({ event }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-violet-600">hotel</span>
          <span className="text-sm font-semibold">Zimmer- / Zelteinteilung</span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-muted-foreground">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          <RoomAssignmentView event={event} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance Section (collapsible, 18.2)
// ---------------------------------------------------------------------------

function AttendanceSection({ event }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">fact_check</span>
          <span className="text-sm font-semibold">Anwesenheit</span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-muted-foreground">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          <AttendanceView event={event} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waitlist Admin Section (17.3)
// ---------------------------------------------------------------------------

function WaitlistAdminSection({ slug }: { slug: string }) {
  const { data: waitlistData } = useWaitlist(slug);
  const removeFromWaitlist = useRemoveFromWaitlist(slug);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const entries = waitlistData?.items ?? [];

  if (entries.length === 0) return null;

  const handleRemove = (entryId: number) => {
    removeFromWaitlist.mutate(entryId, {
      onSuccess: () => {
        toast.success('Von Warteliste entfernt');
        setConfirmRemoveId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold flex items-center gap-2 pb-2 border-b mb-3">
        <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
        Warteliste ({entries.length})
      </h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between border rounded-xl p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {(entry.person_display_name || entry.user_display_name)?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {entry.person_display_name || entry.user_display_name || `User #${entry.user_id}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.booking_option_name} &middot;{' '}
                  {new Date(entry.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmRemoveId(entry.id)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Von Warteliste entfernen"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmRemoveId !== null}
        onConfirm={() => confirmRemoveId && handleRemove(confirmRemoveId)}
        onCancel={() => setConfirmRemoveId(null)}
        title="Von Warteliste entfernen?"
        description="Der Eintrag wird unwiderruflich von der Warteliste gelöscht."
        confirmLabel="Entfernen"
        loading={removeFromWaitlist.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Registration Dialog
// ---------------------------------------------------------------------------

function AdminRegisterDialog({
  event,
  onClose,
}: {
  event: EventDetail;
  onClose: () => void;
}) {
  const adminRegister = useAdminRegister(event.slug);
  const { data: personsData } = usePersons();
  const persons = personsData ?? [];

  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedBookingOptionId, setSelectedBookingOptionId] = useState<number | null>(null);

  // Inline person fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [scoutName, setScoutName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('no_answer');

  const handleSubmit = () => {
    const entry =
      mode === 'existing'
        ? {
            person_id: selectedPersonId,
            booking_option_id: selectedBookingOptionId,
          }
        : {
            person_data: {
              first_name: firstName,
              last_name: lastName,
              scout_name: scoutName || undefined,
              email: email || undefined,
              birthday: birthday || null,
              gender,
            },
            booking_option_id: selectedBookingOptionId,
          };

    adminRegister.mutate(
      { persons: [entry] },
      {
        onSuccess: () => {
          toast.success('Teilnehmer hinzugefügt');
          onClose();
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const isValid =
    mode === 'existing'
      ? selectedPersonId !== null
      : firstName.trim() !== '' && lastName.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-bold">Teilnehmer hinzufügen</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('new')}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                mode === 'new'
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'hover:bg-muted',
              )}
            >
              Neue Person anlegen
            </button>
            <button
              onClick={() => setMode('existing')}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                mode === 'existing'
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'hover:bg-muted',
              )}
            >
               Bestehende Person wählen
            </button>
          </div>

          {/* Existing Person Mode */}
          {mode === 'existing' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                 Person auswählen *
              </label>
              <select
                value={selectedPersonId ?? ''}
                onChange={(e) => setSelectedPersonId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
              >
                 <option value="">Bitte wählen...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                    {p.scout_name ? ` (${p.scout_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Person Mode */}
          {mode === 'new' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                    placeholder="Vorname"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                    placeholder="Nachname"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Pfadfindername
                  </label>
                  <input
                    type="text"
                    value={scoutName}
                    onChange={(e) => setScoutName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                    placeholder="optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Geburtstag
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Geschlecht
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
                  >
                    <option value="no_answer">Keine Angabe</option>
                    <option value="male">Männlich</option>
                    <option value="female">Weiblich</option>
                    <option value="diverse">Divers</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Booking Option (admin sees all, including system + expired) */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Buchungsoption
            </label>
            <select
              value={selectedBookingOptionId ?? ''}
              onChange={(e) =>
                setSelectedBookingOptionId(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
            >
              <option value="">Keine</option>
              {event.booking_options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                  {opt.is_system ? ' (System)' : ''}
                  {!opt.is_bookable && !opt.is_system ? ' (abgelaufen)' : ''}
                  {' - '}
                  {parseFloat(opt.price).toFixed(2)}&euro;
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {adminRegister.isError && (
            <p className="text-xs text-destructive">{adminRegister.error.message}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid || adminRegister.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
            >
               {adminRegister.isPending ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
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
