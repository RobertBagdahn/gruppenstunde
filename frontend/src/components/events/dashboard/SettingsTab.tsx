/**
 * SettingsTab — Custom field management, label management, event editing, danger zone.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { EventDetail } from '@/schemas/event';
import {
  useCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  useLabels,
  useCreateLabel,
  useDeleteLabel,
} from '@/api/eventDashboard';
import {
  useUpdateEvent,
  useDeleteEvent,
  useCreateBookingOption,
  useDeleteBookingOption,
  useDuplicateEvent,
} from '@/api/events';
import { useMealPlans } from '@/api/mealPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import { MeetingPointPicker } from '@/components/events/MeetingPointPicker';

interface Props {
  event: EventDetail;
}

const PHASE_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  pre_registration: 'Vor der Anmeldung',
  registration: 'Anmeldung offen',
  pre_event: 'Vor dem Event',
  running: 'Event läuft',
  completed: 'Abgeschlossen',
};

export default function SettingsTab({ event }: Props) {
  return (
    <div className="space-y-8">
      <EventDataSection event={event} />
      <ParticipantVisibilitySection event={event} />
      <BookingOptionsSection event={event} />
      <MealPlanLinkSection event={event} />
      <CustomFieldsSection event={event} />
      <LabelsSection event={event} />
      <DuplicationSection event={event} />
      <DangerZoneSection event={event} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Participant Visibility Section
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS = [
  {
    value: 'none',
    label: 'Nicht sichtbar',
    description: 'Teilnehmer sehen keine Anmeldezahlen',
    icon: 'visibility_off',
  },
  {
    value: 'total_only',
    label: 'Nur Gesamtzahl',
    description: 'Teilnehmer sehen die Gesamtzahl der Anmeldungen',
    icon: 'tag',
  },
  {
    value: 'per_option',
    label: 'Zahlen pro Buchungsoption',
    description: 'Teilnehmer sehen Anmeldezahlen pro Buchungsoption',
    icon: 'format_list_numbered',
  },
  {
    value: 'with_names',
    label: 'Zahlen und Vornamen',
    description: 'Teilnehmer sehen Vornamen der Angemeldeten (z.B. für Fahrgemeinschaften)',
    icon: 'badge',
  },
];

function ParticipantVisibilitySection({ event }: Props) {
  const updateEvent = useUpdateEvent(event.slug);
  const [selected, setSelected] = useState(event.participant_visibility || 'none');

  const handleChange = (value: string) => {
    setSelected(value);
    updateEvent.mutate(
      { participant_visibility: value },
      {
        onSuccess: () => toast.success('Sichtbarkeit aktualisiert'),
        onError: (err) => {
          toast.error('Fehler', { description: err.message });
          setSelected(event.participant_visibility || 'none');
        },
      },
    );
  };

  return (
    <section>
      <SectionHeader icon="visibility" title="Teilnehmer-Sichtbarkeit" />
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Bestimme, welche Teilnehmer-Informationen eingeladene Mitglieder sehen können.
      </p>
      <div className="space-y-2">
        {VISIBILITY_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
              selected === opt.value
                ? 'border-violet-300 bg-violet-50/50'
                : 'hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="participant-visibility"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => handleChange(opt.value)}
              className="mt-0.5 accent-violet-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                  {opt.icon}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Event Data Section
// ---------------------------------------------------------------------------

function EventDataSection({ event }: Props) {
  const updateEvent = useUpdateEvent(event.slug);
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description);
  const [startDate, setStartDate] = useState(event.start_date?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(event.end_date?.slice(0, 10) ?? '');
  const [isPublic, setIsPublic] = useState(event.is_public);
  const [guestRegistrationEnabled, setGuestRegistrationEnabled] = useState(
    event.guest_registration_enabled,
  );
  const [isTemplate, setIsTemplate] = useState(event.is_template);
  const [manualPhase, setManualPhase] = useState<string>(event.manual_phase ?? '');
  const [location, setLocation] = useState(event.location);
  const [meetingPointId, setMeetingPointId] = useState<number | null>(
    event.meeting_point?.id ?? null,
  );
  const [pickupPointId, setPickupPointId] = useState<number | null>(
    event.pickup_point?.id ?? null,
  );
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSave = () => {
    updateEvent.mutate(
      {
        name,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        is_public: isPublic,
        guest_registration_enabled: guestRegistrationEnabled,
        is_template: isTemplate,
        manual_phase: manualPhase || null,
        location,
        meeting_point_id: meetingPointId,
        pickup_point_id: pickupPointId,
      },
      {
        onSuccess: () => toast.success('Event aktualisiert'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const guestRegUrl = `${window.location.origin}/events/${event.slug}/register`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(guestRegUrl).then(() => {
      setLinkCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <section>
      <SectionHeader icon="edit" title="Event-Daten" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div className="sm:col-span-2">
          <FieldLabel>Name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Beschreibung</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-y"
          />
        </div>
        <div>
          <FieldLabel>Startdatum</FieldLabel>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <div>
          <FieldLabel>Enddatum</FieldLabel>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <div>
          <FieldLabel>Ort</FieldLabel>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <div className="sm:col-span-2 border-t pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Optional: Wo treffen sich die Teilnehmer? Wo werden sie abgeholt?
          </p>
          <MeetingPointPicker
            label="Treffpunkt (Start)"
            selectedId={meetingPointId}
            onSelect={setMeetingPointId}
          />
          <MeetingPointPicker
            label="Abholpunkt (Ende)"
            selectedId={pickupPointId}
            onSelect={setPickupPointId}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="is-public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is-public" className="text-sm">
            Öffentlich sichtbar
          </label>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="guest-registration"
            checked={guestRegistrationEnabled}
            onChange={(e) => setGuestRegistrationEnabled(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="guest-registration" className="text-sm">
            Gastregistrierung
          </label>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="is-template"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is-template" className="text-sm">
            Als Vorlage speichern
          </label>
          <span className="text-xs text-muted-foreground">
            — Vorlagen erscheinen nicht in der Event-Liste
          </span>
        </div>
      </div>

      {/* Manual Phase Override */}
      <div className="mt-4 border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">tune</span>
          <span className="text-sm font-medium">Phase manuell steuern</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Standardmäßig wird die Phase automatisch anhand der Daten berechnet. Du kannst sie manuell überschreiben.
        </p>
        <select
          value={manualPhase}
          onChange={(e) => setManualPhase(e.target.value)}
          className="w-full sm:w-64 text-sm border rounded-lg px-3 py-2 bg-background"
        >
          <option value="">Automatisch</option>
          <option value="draft">Entwurf</option>
          <option value="pre_registration">Vor der Anmeldung</option>
          <option value="registration">Anmeldung offen</option>
          <option value="pre_event">Vor dem Event</option>
          <option value="running">Event läuft</option>
          <option value="completed">Abgeschlossen</option>
        </select>
        {manualPhase && manualPhase !== event.phase && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">warning</span>
            <span>
              Die manuelle Phase ({PHASE_LABELS[manualPhase] ?? manualPhase}) weicht von der berechneten Phase ({PHASE_LABELS[event.phase] ?? event.phase}) ab.
            </span>
          </div>
        )}
      </div>

      {/* Guest registration link */}
      {guestRegistrationEnabled && (
        <div className="mt-3 border rounded-lg p-3 bg-violet-50 dark:bg-violet-950/30 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-violet-700 dark:text-violet-400">
            <span className="material-symbols-outlined text-[16px]">link</span>
             Anmeldelink für Gäste
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={guestRegUrl}
              className="flex-1 text-xs border rounded-lg px-3 py-2 bg-background text-muted-foreground select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 text-xs font-medium rounded-lg border hover:bg-muted transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {linkCopied ? 'check' : 'content_copy'}
              </span>
              {linkCopied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
             Teile diesen Link mit Eltern, damit sie ihre Kinder ohne Account anmelden können.
          </p>
        </div>
      )}
      <div className="mt-3">
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          {updateEvent.isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Booking Options Section
// ---------------------------------------------------------------------------

function BookingOptionsSection({ event }: Props) {
  const createBookingOption = useCreateBookingOption(event.slug);
  const deleteBookingOption = useDeleteBookingOption(event.slug);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('0.00');
  const [newMax, setNewMax] = useState(0);
  const [newBookableFrom, setNewBookableFrom] = useState('');
  const [newBookableTill, setNewBookableTill] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingOption.mutate(
      {
        name: newName,
        price: newPrice,
        max_participants: newMax,
        bookable_from: newBookableFrom || null,
        bookable_till: newBookableTill || null,
      },
      {
        onSuccess: () => {
          toast.success('Buchungsoption erstellt');
          setShowForm(false);
          setNewName('');
          setNewPrice('0.00');
          setNewMax(0);
          setNewBookableFrom('');
          setNewBookableTill('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteBookingOption.mutate(id, {
      onSuccess: () => {
        toast.success('Buchungsoption gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <section>
      <SectionHeader icon="confirmation_number" title="Buchungsoptionen" />
      <div className="space-y-2 mt-3">
        {event.booking_options.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center justify-between border rounded-lg p-3 text-sm"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{opt.name}</span>
                <span className="text-muted-foreground">
                  {parseFloat(opt.price).toFixed(2)}&nbsp;&euro;
                </span>
                {opt.max_participants > 0 && (
                  <span className="text-muted-foreground">
                    (max. {opt.max_participants})
                  </span>
                )}
                {opt.is_system && (
                  <span className="inline-flex items-center gap-0.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    System
                  </span>
                )}
                {!opt.is_bookable && !opt.is_system && (
                  <span className="inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    Nicht buchbar
                  </span>
                )}
              </div>
              {(opt.bookable_from || opt.bookable_till) && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">date_range</span>
                  {opt.bookable_from && (
                    <span>
                      Ab {new Date(opt.bookable_from).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {opt.bookable_from && opt.bookable_till && <span>&ndash;</span>}
                  {opt.bookable_till && (
                    <span>
                      Bis {new Date(opt.bookable_till).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
            </div>
            {!opt.is_system && (
              <button
                onClick={() => setConfirmDeleteId(opt.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          </div>
        ))}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Neue Buchungsoption
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="border rounded-lg p-3 space-y-3 bg-muted/30"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Name *</FieldLabel>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="z.B. Standardbeitrag"
                />
              </div>
              <div>
                <FieldLabel>Preis (&euro;)</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                />
              </div>
              <div>
                <FieldLabel>Max. Teilnehmer</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="0 = unbegrenzt"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Buchbar ab (optional)</FieldLabel>
                <input
                  type="datetime-local"
                  value={newBookableFrom}
                  onChange={(e) => setNewBookableFrom(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                />
              </div>
              <div>
                <FieldLabel>Buchbar bis (optional)</FieldLabel>
                <input
                  type="datetime-local"
                  value={newBookableTill}
                  onChange={(e) => setNewBookableTill(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createBookingOption.isPending}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Buchungsoption löschen?"
        description="Teilnehmer mit dieser Option behalten ihren Platz, verlieren aber die Zuordnung."
        confirmLabel="Löschen"
        loading={deleteBookingOption.isPending}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Meal Plan Link Section (24.1 + 24.2)
// ---------------------------------------------------------------------------

function MealPlanLinkSection({ event }: Props) {
  const updateEvent = useUpdateEvent(event.slug);
  const { data: mealPlans, isLoading } = useMealPlans();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(event.meal_plan_id ?? null);

  const handleLink = () => {
    updateEvent.mutate(
      { meal_plan_id: selectedId },
      {
        onSuccess: () => toast.success(selectedId ? 'Essensplan verknüpft' : 'Essensplan entfernt'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const linkedMealPlan = mealPlans?.find((me) => me.id === event.meal_plan_id);

  return (
    <section>
      <SectionHeader icon="restaurant_menu" title="Essensplan verknüpfen" />
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Verknüpfe einen bestehenden Essensplan mit diesem Event, um Mahlzeiten zu planen.
      </p>

      {/* Current link status */}
      {linkedMealPlan && (
        <div className="flex items-center justify-between border rounded-lg p-3 mb-3 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">link</span>
            <div>
              <p className="text-sm font-medium">{linkedMealPlan.name}</p>
              <p className="text-xs text-muted-foreground">
                {linkedMealPlan.meals_count} Mahlzeiten
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/meal-plans/${linkedMealPlan.id}`)}
            className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
          >
            Öffnen
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="flex-1 w-full sm:w-auto">
          <FieldLabel>Essensplan auswählen</FieldLabel>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            disabled={isLoading}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          >
            <option value="">Kein Essensplan</option>
            {(mealPlans ?? []).map((me) => (
              <option key={me.id} value={me.id}>
                {me.name} ({me.meals_count} Mahlzeiten)
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLink}
          disabled={updateEvent.isPending || selectedId === (event.meal_plan_id ?? null)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">link</span>
          {updateEvent.isPending ? 'Wird gespeichert...' : 'Verknüpfen'}
        </button>
      </div>

      {/* Quick link to create new meal plan */}
      <button
        onClick={() => navigate('/meal-plans/new')}
        className="mt-2 flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        Neuen Essensplan erstellen
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Custom Fields Section
// ---------------------------------------------------------------------------

function CustomFieldsSection({ event }: Props) {
  const { data: fields } = useCustomFields(event.slug);
  const createField = useCreateCustomField(event.slug);
  const deleteField = useDeleteCustomField(event.slug);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Zahl' },
    { value: 'boolean', label: 'Ja/Nein' },
    { value: 'select', label: 'Auswahl' },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createField.mutate(
      { label: newLabel, field_type: newType, is_required: newRequired },
      {
        onSuccess: () => {
          toast.success('Feld erstellt');
          setShowForm(false);
          setNewLabel('');
          setNewType('text');
          setNewRequired(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteField.mutate(id, {
      onSuccess: () => {
        toast.success('Feld gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <section>
      <SectionHeader icon="tune" title="Benutzerdefinierte Felder" />
      <div className="space-y-2 mt-3">
        {(fields ?? []).map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between border rounded-lg p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{f.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {f.field_type_display}
              </span>
              {f.is_required && (
                <span className="text-xs text-amber-600">Pflichtfeld</span>
              )}
            </div>
            <button
              onClick={() => setConfirmDeleteId(f.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}

        {(fields ?? []).length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">
            Keine benutzerdefinierten Felder definiert.
          </p>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Neues Feld
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="border rounded-lg p-3 space-y-3 bg-muted/30"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Bezeichnung *</FieldLabel>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="z.B. T-Shirt-Größe"
                />
              </div>
              <div>
                <FieldLabel>Typ</FieldLabel>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="field-required" className="text-sm">
                  Pflichtfeld
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createField.isPending}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Feld löschen?"
        description="Das Feld und alle zugehörigen Werte werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteField.isPending}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Labels Section
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#F44336',
  '#009688',
  '#FF5722',
  '#607D8B',
];

function LabelsSection({ event }: Props) {
  const { data: labels } = useLabels(event.slug);
  const createLabel = useCreateLabel(event.slug);
  const deleteLabel = useDeleteLabel(event.slug);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createLabel.mutate(
      { name: newName, color: newColor },
      {
        onSuccess: () => {
          toast.success('Label erstellt');
          setShowForm(false);
          setNewName('');
          setNewColor(PRESET_COLORS[0]);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteLabel.mutate(id, {
      onSuccess: () => {
        toast.success('Label gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <section>
      <SectionHeader icon="label" title="Labels" />
      <div className="space-y-2 mt-3">
        {(labels ?? []).map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between border rounded-lg p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: l.color }}
              />
              <span className="font-medium">{l.name}</span>
            </div>
            <button
              onClick={() => setConfirmDeleteId(l.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}

        {(labels ?? []).length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">
            Keine Labels definiert.
          </p>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Neues Label
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="border rounded-lg p-3 space-y-3 bg-muted/30"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Name *</FieldLabel>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="z.B. Zelt A"
                />
              </div>
              <div>
                <FieldLabel>Farbe</FieldLabel>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: c === newColor ? '#000' : 'transparent',
                        transform: c === newColor ? 'scale(1.15)' : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createLabel.isPending}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Label löschen?"
        description="Das Label wird von allen Teilnehmern entfernt und unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteLabel.isPending}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Duplication Section
// ---------------------------------------------------------------------------

function DuplicationSection({ event }: Props) {
  const navigate = useNavigate();
  const duplicateEvent = useDuplicateEvent(event.slug);
  const [dateShiftWeeks, setDateShiftWeeks] = useState<string>('');

  const handleDuplicate = () => {
    const body: { date_shift_weeks?: number } = {};
    const weeks = parseInt(dateShiftWeeks, 10);
    if (!isNaN(weeks) && weeks !== 0) {
      body.date_shift_weeks = weeks;
    }
    duplicateEvent.mutate(body, {
      onSuccess: (newEvent) => {
        toast.success('Event dupliziert');
        navigate(`/events/app/${newEvent.slug}`);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <section>
      <SectionHeader icon="content_copy" title="Event duplizieren" />
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Erstelle eine Kopie dieses Events mit allen Einstellungen, Buchungsoptionen und Labels.
        Teilnehmer und Zahlungen werden nicht kopiert.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div>
          <FieldLabel>Datumsverschiebung (Wochen, optional)</FieldLabel>
          <input
            type="number"
            value={dateShiftWeeks}
            onChange={(e) => setDateShiftWeeks(e.target.value)}
            placeholder="z.B. 52 für nächstes Jahr"
            className="w-full sm:w-56 text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <button
          onClick={handleDuplicate}
          disabled={duplicateEvent.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
          {duplicateEvent.isPending ? 'Duplizieren...' : 'Duplizieren'}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone Section
// ---------------------------------------------------------------------------

function DangerZoneSection({ event }: Props) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    deleteEvent.mutate(event.slug, {
      onSuccess: () => {
        toast.success('Event gelöscht');
        navigate('/events/app');
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <section>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Gefahrenzone
        </h3>
        <p className="text-xs text-red-600 mb-3">
          Das Löschen eines Events kann nicht rückgängig gemacht werden. Alle
          Teilnehmer, Zahlungen und Daten werden unwiderruflich entfernt.
        </p>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Event löschen
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        title="Event unwiderruflich löschen?"
        description={`Das Event "${event.name}" und alle zugehörigen Daten (Teilnehmer, Zahlungen, Timeline) werden unwiderruflich gelöscht.`}
        confirmLabel="Endgültig löschen"
        loading={deleteEvent.isPending}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="text-sm font-semibold flex items-center gap-2 pb-2 border-b">
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {title}
    </h3>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-muted-foreground block mb-1">
      {children}
    </label>
  );
}
