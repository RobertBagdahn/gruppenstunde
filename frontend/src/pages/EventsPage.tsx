import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useEvents,
  useEvent,
  usePersons,
  useRegisterForEvent,
  useRemoveParticipant,
  useUpdateParticipant,
  useCreateBookingOption,
  useDeleteBookingOption,
  useDeleteEvent,
  useUpdateEvent,
  useInviteGroup,
  useInviteUsers,
} from '@/api/events';
import { usePackingLists } from '@/api/packingLists';
import { useGroups } from '@/api/profile';
import { useSearchUsers } from '@/api/planner';
import type { UserSearchResult } from '@/api/planner';
import type { UserGroup } from '@/schemas/profile';
import type { EventList, EventDetail } from '@/schemas/event';
import { cn } from '@/lib/utils';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function EventsPage() {
  const { data: user } = useCurrentUser();
  const { data: events, isLoading, error: eventsError, refetch: refetchEvents } = useEvents();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div>
      {/* Tool-colored header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <span className="material-symbols-outlined text-[22px]">celebration</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">Veranstaltungen</h1>
          <p className="text-xs text-muted-foreground">Lager, Elternabende und Aktionen verwalten</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar: Event List */}
        <div className="w-full md:w-72 md:shrink-0 space-y-3">
          {user && (
            <button
              onClick={() => navigate('/events/app/new')}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-sm font-medium flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Neues Event
            </button>
          )}

          {isLoading && <p className="text-sm text-muted-foreground">Laden...</p>}

          {eventsError && (
            <ErrorDisplay error={eventsError} variant="inline" onRetry={() => refetchEvents()} />
          )}

          {events?.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={selectedSlug === ev.slug}
              onClick={() => setSelectedSlug(ev.slug)}
            />
          ))}

          {events && events.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Events verfügbar.</p>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {selectedSlug ? (
            <EventDetailView
              slug={selectedSlug}
              onDeleted={() => setSelectedSlug(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <span className="material-symbols-outlined text-[48px] mb-3">celebration</span>
              <p>Wähle ein Event aus oder erstelle ein neues.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Card (Sidebar)
// ---------------------------------------------------------------------------

function EventCard({ event, selected, onClick }: { event: EventList; selected: boolean; onClick: () => void }) {
  const dateStr = event.start_date
    ? new Date(event.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg text-sm border transition-all',
        selected
          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-violet-500 shadow-sm'
          : 'hover:bg-muted border-transparent hover:border-border'
      )}
    >
      <div className="font-medium truncate">{event.name}</div>
      <div className={cn('flex items-center gap-2 mt-1 text-xs', selected ? 'text-white/80' : 'text-muted-foreground')}>
        {dateStr && (
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {dateStr}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">group</span>
          {event.participant_count}
        </span>
        {event.is_public && (
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">public</span>
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Event Detail View
// ---------------------------------------------------------------------------

function EventDetailView({ slug, onDeleted }: { slug: string; onDeleted: () => void }) {
  const { data: user } = useCurrentUser();
  const { data: event, isLoading, isError, error, refetch } = useEvent(slug);
  const deleteEvent = useDeleteEvent();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  if (isError) return <ErrorDisplay error={error as Error} title="Event konnte nicht geladen werden" onRetry={() => refetch()} />;
  if (!event) return <ErrorDisplay error={null} title="Event nicht gefunden" />;

  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteEvent.mutate(slug, {
            onSuccess: () => {
              toast.success('Event geloescht');
              setShowDeleteConfirm(false);
              onDeleted();
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Event loeschen?"
        description="Das Event und alle zugehoerigen Anmeldungen werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteEvent.isPending}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{event.name}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {event.start_date && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {dateFormatter.format(new Date(event.start_date))}
              </span>
            )}
            {event.end_date && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">event</span>
                bis {dateFormatter.format(new Date(event.end_date))}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {event.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">group</span>
              {event.participant_count} Teilnehmer
            </span>
          </div>
        </div>
        {event.is_manager && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className={cn(
                "px-3 py-1.5 text-sm border rounded-md flex items-center gap-1",
                showEditForm ? "bg-violet-600 text-white border-violet-600" : "hover:bg-muted"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Bearbeiten
            </button>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Einladen
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm border border-destructive/30 text-destructive rounded-md hover:bg-destructive/5"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && !showEditForm && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
      )}

      {/* Edit Form (Manager) */}
      {showEditForm && event.is_manager && (
        <EventEditForm event={event} slug={slug} onDone={() => setShowEditForm(false)} />
      )}

      {/* Invite (Manager) */}
      {showInviteForm && event.is_manager && (
        <InviteForm eventSlug={slug} />
      )}

      {/* Booking Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Buchungsoptionen</h3>
          {event.is_manager && (
            <button
              onClick={() => setShowBookingForm(!showBookingForm)}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Hinzufügen
            </button>
          )}
        </div>
        {showBookingForm && event.is_manager && (
          <AddBookingOptionForm eventSlug={slug} onDone={() => setShowBookingForm(false)} />
        )}
        {event.booking_options.length > 0 ? (
          <div className="grid gap-2">
            {event.booking_options.map((opt) => (
              <BookingOptionCard key={opt.id} option={opt} eventSlug={slug} isManager={event.is_manager} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Keine Buchungsoptionen vorhanden.</p>
        )}
      </div>

      {/* Registration Status + Registration Form */}
      {user && (
        <div>
          {event.is_registered && event.my_registration ? (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Du bist angemeldet
              </div>
              <div className="space-y-2">
                {event.my_registration.participants.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    eventSlug={slug}
                    canRemove
                    canEditPayment={event.is_manager}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowRegisterForm(!showRegisterForm)}
                className="text-xs text-primary hover:underline"
              >
                Weitere Personen anmelden
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              Anmelden
            </button>
          )}
          {showRegisterForm && (
            <RegisterForm
              eventSlug={slug}
              bookingOptions={event.booking_options}
              onDone={() => setShowRegisterForm(false)}
            />
          )}
        </div>
      )}

      {/* Manager: Full Registration List */}
      {event.is_manager && event.all_registrations && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            Alle Anmeldungen ({event.participant_count})
          </h3>
          {event.all_registrations.length > 0 ? (
            <div className="space-y-4">
              {event.all_registrations.map((reg) => (
                <div key={reg.id} className="border rounded-lg p-3 space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">{reg.user_email}</div>
                  {reg.participants.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      eventSlug={slug}
                      canRemove
                      canEditPayment
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Noch keine Anmeldungen.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Edit Form
// ---------------------------------------------------------------------------

function EventEditForm({ event, slug, onDone }: { event: EventDetail; slug: string; onDone: () => void }) {
  const updateEvent = useUpdateEvent(slug);
  const { data: packingLists } = usePackingLists();

  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description);
  const [location, setLocation] = useState(event.location);
  const [startDate, setStartDate] = useState(event.start_date ? event.start_date.slice(0, 16) : '');
  const [endDate, setEndDate] = useState(event.end_date ? event.end_date.slice(0, 16) : '');
  const [registrationDeadline, setRegistrationDeadline] = useState(
    event.registration_deadline ? event.registration_deadline.slice(0, 16) : ''
  );
  const [isPublic, setIsPublic] = useState(event.is_public);
  const [packingListId, setPackingListId] = useState<number | null>(event.packing_list_id ?? null);

  function handleSave() {
    updateEvent.mutate(
      {
        name: name.trim(),
        description,
        location,
        start_date: startDate || null,
        end_date: endDate || null,
        registration_deadline: registrationDeadline || null,
        is_public: isPublic,
        packing_list_id: packingListId,
      },
      {
        onSuccess: () => {
          toast.success('Event aktualisiert');
          onDone();
        },
        onError: (err) => {
          toast.error('Fehler beim Speichern', { description: err.message });
        },
      },
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[18px]">edit</span>
        Event bearbeiten
      </h3>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Beschreibung</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background resize-y"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Ort</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="z.B. Pfadfinderheim"
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ende</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
      </div>

      {/* Registration deadline */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Anmeldeschluss</label>
        <input
          type="datetime-local"
          value={registrationDeadline}
          onChange={(e) => setRegistrationDeadline(e.target.value)}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        />
      </div>

      {/* Packing List */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Packliste</label>
        <select
          value={packingListId ?? ''}
          onChange={(e) => setPackingListId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
        >
          <option value="">Keine Packliste</option>
          {packingLists?.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.title}
            </option>
          ))}
        </select>
      </div>

      {/* Public toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        Oeffentlich sichtbar
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || updateEvent.isPending}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          {updateEvent.isPending ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Speichern...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Speichern
            </>
          )}
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Participant Row
// ---------------------------------------------------------------------------

function ParticipantRow({
  participant,
  eventSlug,
  canRemove,
  canEditPayment,
}: {
  participant: { id: number; first_name: string; last_name: string; scout_name: string; booking_option_name: string; is_paid: boolean; gender: string; nutritional_tags: { id: number; name: string }[] };
  eventSlug: string;
  canRemove: boolean;
  canEditPayment: boolean;
}) {
  const removeParticipant = useRemoveParticipant(eventSlug);
  const updateParticipant = useUpdateParticipant(eventSlug);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-muted-foreground">person</span>
        <span className="font-medium">{participant.first_name} {participant.last_name}</span>
        {participant.scout_name && (
          <span className="text-xs text-muted-foreground">({participant.scout_name})</span>
        )}
        {participant.booking_option_name && (
           <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
            {participant.booking_option_name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {canEditPayment && (
          <button
            onClick={() =>
              updateParticipant.mutate({
                participantId: participant.id,
                is_paid: !participant.is_paid,
              })
            }
            className={cn(
              'text-xs px-2 py-1 rounded-full border transition-colors',
              participant.is_paid
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {participant.is_paid ? '✓ Bezahlt' : '○ Offen'}
          </button>
        )}
        {!canEditPayment && (
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              participant.is_paid ? 'text-green-600' : 'text-amber-600'
            )}
          >
            {participant.is_paid ? '✓ Bezahlt' : '○ Offen'}
          </span>
        )}
        {canRemove && (
          <button
            onClick={() => removeParticipant.mutate(participant.id)}
            className="text-destructive hover:underline text-xs"
          >
            Entfernen
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Register Form
// ---------------------------------------------------------------------------

function RegisterForm({
  eventSlug,
  bookingOptions,
  onDone,
}: {
  eventSlug: string;
  bookingOptions: { id: number; name: string; price: string; is_full: boolean }[];
  onDone: () => void;
}) {
  const { data: persons, isLoading } = usePersons();
  const register = useRegisterForEvent(eventSlug);
  const [selectedPersons, setSelectedPersons] = useState<Map<number, number | null>>(new Map());

  const togglePerson = (personId: number) => {
    setSelectedPersons((prev) => {
      const next = new Map(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.set(personId, bookingOptions[0]?.id ?? null);
      }
      return next;
    });
  };

  const setBookingOption = (personId: number, optionId: number | null) => {
    setSelectedPersons((prev) => {
      const next = new Map(prev);
      next.set(personId, optionId);
      return next;
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground mt-2">Personen laden...</p>;

  return (
    <div className="border rounded-lg p-4 mt-3 space-y-3">
      <h4 className="text-sm font-semibold">Personen zur Anmeldung auswählen</h4>
      {persons && persons.length > 0 ? (
        <div className="space-y-2">
          {persons.map((person) => (
            <div key={person.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b last:border-0">
              <label className="flex items-center gap-2 flex-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPersons.has(person.id)}
                  onChange={() => togglePerson(person.id)}
                  className="rounded"
                />
                <span className="font-medium">
                  {person.first_name} {person.last_name}
                </span>
                {person.is_owner && (
                  <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Ich</span>
                )}
              </label>
              {selectedPersons.has(person.id) && bookingOptions.length > 0 && (
                <select
                  value={selectedPersons.get(person.id) ?? ''}
                  onChange={(e) => setBookingOption(person.id, e.target.value ? Number(e.target.value) : null)}
                  className="px-2 py-1 rounded border text-xs bg-background"
                >
                  <option value="">Keine Option</option>
                  {bookingOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.is_full}>
                      {opt.name} ({opt.price}€){opt.is_full ? ' – Voll' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Du hast noch keine Personen angelegt. Lege zuerst eine Person an.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (selectedPersons.size > 0) {
              register.mutate(
                {
                  persons: Array.from(selectedPersons.entries()).map(([person_id, booking_option_id]) => ({
                    person_id,
                    booking_option_id,
                  })),
                },
                {
                  onSuccess: () => {
                    toast.success('Anmeldung erfolgreich');
                    onDone();
                  },
                  onError: (err) => {
                    toast.error('Fehler bei der Anmeldung', { description: err.message });
                  },
                }
              );
            }
          }}
          disabled={selectedPersons.size === 0 || register.isPending}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-sm disabled:opacity-50"
        >
          {register.isPending ? 'Anmelden...' : `${selectedPersons.size} Person(en) anmelden`}
        </button>
        <button onClick={onDone} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
          Abbrechen
        </button>
      </div>
      {register.isError && (
        <p className="text-xs text-destructive">{register.error.message}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Booking Option Form
// ---------------------------------------------------------------------------

function AddBookingOptionForm({ eventSlug, onDone }: { eventSlug: string; onDone: () => void }) {
  const createOption = useCreateBookingOption(eventSlug);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0.00');
  const [maxParticipants, setMaxParticipants] = useState(0);

  return (
    <div className="border rounded-lg p-3 mb-3 space-y-2 bg-muted/30">
      <input
        type="text"
        placeholder="Name der Option *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-1.5 rounded-md border text-sm bg-background"
      />
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Preis (€)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.01"
          min="0"
          className="flex-1 px-3 py-1.5 rounded-md border text-sm bg-background"
        />
        <input
          type="number"
          placeholder="Max. TN (0=∞)"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(Number(e.target.value))}
          min="0"
          className="flex-1 px-3 py-1.5 rounded-md border text-sm bg-background"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (name.trim()) {
              createOption.mutate(
                { name: name.trim(), price, max_participants: maxParticipants },
                {
                  onSuccess: () => {
                    toast.success('Buchungsoption erstellt');
                    setName(''); setPrice('0.00'); setMaxParticipants(0); onDone();
                  },
                  onError: (err) => {
                    toast.error('Fehler beim Erstellen', { description: err.message });
                  },
                }
              );
            }
          }}
          disabled={!name.trim() || createOption.isPending}
          className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-xs disabled:opacity-50"
        >
          Speichern
        </button>
        <button onClick={onDone} className="px-3 py-1.5 border rounded-md text-xs hover:bg-muted">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Option Card
// ---------------------------------------------------------------------------

function BookingOptionCard({
  option,
  eventSlug,
  isManager,
}: {
  option: { id: number; name: string; description: string; price: string; max_participants: number; current_participant_count: number; is_full: boolean };
  eventSlug: string;
  isManager: boolean;
}) {
  const deleteOption = useDeleteBookingOption(eventSlug);

  return (
    <div className="flex items-center justify-between border rounded-lg px-3 py-2">
      <div>
        <span className="text-sm font-medium">{option.name}</span>
        <span className="text-sm text-muted-foreground ml-2">{option.price}€</span>
        {option.max_participants > 0 && (
          <span className="text-xs text-muted-foreground ml-2">
            ({option.current_participant_count}/{option.max_participants})
          </span>
        )}
        {option.is_full && (
          <span className="text-xs text-destructive ml-2">Voll</span>
        )}
      </div>
      {isManager && (
        <button
          onClick={() => deleteOption.mutate(option.id)}
          className="text-destructive hover:underline text-xs"
        >
          Löschen
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite Form (Groups + Users with multi-select autocomplete)
// ---------------------------------------------------------------------------

function InviteForm({ eventSlug }: { eventSlug: string }) {
  const [tab, setTab] = useState<'group' | 'user'>('group');

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('group')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md font-medium',
            tab === 'group' ? 'bg-violet-600 text-white' : 'border hover:bg-muted',
          )}
        >
          Gruppe einladen
        </button>
        <button
          onClick={() => setTab('user')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md font-medium',
            tab === 'user' ? 'bg-violet-600 text-white' : 'border hover:bg-muted',
          )}
        >
          Benutzer einladen
        </button>
      </div>

      {tab === 'group' && <InviteGroupSection eventSlug={eventSlug} />}
      {tab === 'user' && <InviteUserSection eventSlug={eventSlug} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite Group Section (multi-select autocomplete)
// ---------------------------------------------------------------------------

function InviteGroupSection({ eventSlug }: { eventSlug: string }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<UserGroup[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: groups } = useGroups(query);
  const inviteGroup = useInviteGroup(eventSlug);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSlugs = new Set(selectedGroups.map((g) => g.slug));
  const filteredGroups = groups?.filter((g) => !selectedSlugs.has(g.slug)) ?? [];

  const handleInvite = () => {
    if (selectedGroups.length === 0) return;
    setSuccessMsg('');
    setErrorMsg('');
    const messages: string[] = [];
    let remaining = selectedGroups.length;

    selectedGroups.forEach((group) => {
      inviteGroup.mutate(
        { group_slug: group.slug },
        {
          onSuccess: (data) => {
            messages.push(data.message);
            remaining--;
            if (remaining === 0) {
              setSelectedGroups([]);
              setSuccessMsg(messages.join('; '));
            }
          },
          onError: (err) => {
            remaining--;
            setErrorMsg((prev) => (prev ? prev + '; ' : '') + err.message);
          },
        },
      );
    });
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedGroups.map((g) => (
            <span
              key={g.slug}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs font-medium"
            >
              {g.name}
              <button
                type="button"
                onClick={() => setSelectedGroups((prev) => prev.filter((x) => x.slug !== g.slug))}
                className="hover:text-destructive"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          placeholder="Gruppe suchen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-3 py-1.5 rounded-md border text-sm bg-background"
        />
        {showDropdown && filteredGroups.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredGroups.map((group) => (
              <li key={group.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroups((prev) => [...prev, group]);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{group.member_count} Mitglieder</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleInvite}
        disabled={selectedGroups.length === 0 || inviteGroup.isPending}
        className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-sm disabled:opacity-50"
      >
        {inviteGroup.isPending ? 'Wird eingeladen...' : `${selectedGroups.length > 0 ? selectedGroups.length + ' ' : ''}Gruppe${selectedGroups.length !== 1 ? 'n' : ''} einladen`}
      </button>

      {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite User Section (multi-select autocomplete)
// ---------------------------------------------------------------------------

function InviteUserSection({ eventSlug }: { eventSlug: string }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: users } = useSearchUsers(query);
  const inviteUsers = useInviteUsers(eventSlug);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedUsers.map((u) => u.id));
  const filteredUsers = users?.filter((u) => !selectedIds.has(u.id)) ?? [];

  const handleInvite = () => {
    if (selectedUsers.length === 0) return;
    inviteUsers.mutate(selectedUsers.map((u) => u.id), {
      onSuccess: () => setSelectedUsers([]),
    });
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs font-medium"
            >
              {u.scout_display_name}
              <button
                type="button"
                onClick={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}
                className="hover:text-destructive"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          placeholder="Name oder E-Mail suchen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-3 py-1.5 rounded-md border text-sm bg-background"
        />
        {showDropdown && filteredUsers.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUsers((prev) => [...prev, user]);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                >
                  <span className="font-medium">{user.scout_display_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleInvite}
        disabled={selectedUsers.length === 0 || inviteUsers.isPending}
        className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-md text-sm disabled:opacity-50"
      >
        {inviteUsers.isPending ? 'Wird eingeladen...' : `${selectedUsers.length > 0 ? selectedUsers.length + ' ' : ''}Benutzer einladen`}
      </button>

      {inviteUsers.isSuccess && (
        <p className="text-xs text-green-600">{inviteUsers.data.message}</p>
      )}
      {inviteUsers.isError && (
        <p className="text-xs text-destructive">{inviteUsers.error.message}</p>
      )}
    </div>
  );
}
