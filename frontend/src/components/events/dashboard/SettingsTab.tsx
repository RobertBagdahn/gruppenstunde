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
} from '@/api/events';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  event: EventDetail;
}

export default function SettingsTab({ event }: Props) {
  return (
    <div className="space-y-8">
      <EventDataSection event={event} />
      <ParticipantVisibilitySection event={event} />
      <BookingOptionsSection event={event} />
      <CustomFieldsSection event={event} />
      <LabelsSection event={event} />
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
  const [location, setLocation] = useState(event.location);

  const handleSave = () => {
    updateEvent.mutate(
      {
        name,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        is_public: isPublic,
        location,
      },
      {
        onSuccess: () => toast.success('Event aktualisiert'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
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
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="is-public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is-public" className="text-sm">
            Oeffentlich sichtbar
          </label>
        </div>
      </div>
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingOption.mutate(
      { name: newName, price: newPrice, max_participants: newMax },
      {
        onSuccess: () => {
          toast.success('Buchungsoption erstellt');
          setShowForm(false);
          setNewName('');
          setNewPrice('0.00');
          setNewMax(0);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteBookingOption.mutate(id, {
      onSuccess: () => {
        toast.success('Buchungsoption geloescht');
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
        title="Buchungsoption loeschen?"
        description="Teilnehmer mit dieser Option behalten ihren Platz, verlieren aber die Zuordnung."
        confirmLabel="Loeschen"
        loading={deleteBookingOption.isPending}
      />
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
        toast.success('Feld geloescht');
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
                  placeholder="z.B. T-Shirt-Groesse"
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
        title="Feld loeschen?"
        description="Das Feld und alle zugehoerigen Werte werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
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
        toast.success('Label geloescht');
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
        title="Label loeschen?"
        description="Das Label wird von allen Teilnehmern entfernt und unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteLabel.isPending}
      />
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
        toast.success('Event geloescht');
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
          Das Loeschen eines Events kann nicht rueckgaengig gemacht werden. Alle
          Teilnehmer, Zahlungen und Daten werden unwiderruflich entfernt.
        </p>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Event loeschen
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        title="Event unwiderruflich loeschen?"
        description={`Das Event "${event.name}" und alle zugehoerigen Daten (Teilnehmer, Zahlungen, Timeline) werden unwiderruflich geloescht.`}
        confirmLabel="Endgueltig loeschen"
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
