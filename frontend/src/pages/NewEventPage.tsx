import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateEvent,
  useLocations,
  useCreateLocation,
  useGenerateInvitation,
} from '@/api/events';
import { usePackingLists } from '@/api/packingLists';
import { useCurrentUser } from '@/api/auth';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MarkdownEditor from '@/components/MarkdownEditor';

const STEPS = [
  { label: 'Grunddaten', icon: 'edit_note' },
  { label: 'Ort', icon: 'location_on' },
  { label: 'Buchungsoptionen', icon: 'payments' },
  { label: 'Einladung', icon: 'mail' },
] as const;

// ---------------------------------------------------------------------------
// Booking option draft (not yet saved)
// ---------------------------------------------------------------------------

interface BookingOptionDraft {
  name: string;
  description: string;
  price: string;
  max_participants: number;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function NewEventPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [step, setStep] = useState(0);

  // Step 0: Name & Dates
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [packingListId, setPackingListId] = useState<number | null>(null);

  // Step 1: Location
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    street: '',
    zip_code: '',
    city: '',
    state: '',
    country: 'Deutschland',
    description: '',
  });

  // Step 2: Booking Options
  const [bookingOptions, setBookingOptions] = useState<BookingOptionDraft[]>([]);
  const [editingOption, setEditingOption] = useState<BookingOptionDraft>({
    name: '',
    description: '',
    price: '0.00',
    max_participants: 0,
  });

  // Step 3: Invitation
  const [specialNotes, setSpecialNotes] = useState('');
  const [invitationText, setInvitationText] = useState('');

  // APIs
  const createEvent = useCreateEvent();
  const { data: locations, isLoading: locationsLoading } = useLocations();
  const createLocation = useCreateLocation();
  const generateInvitation = useGenerateInvitation();
  const { data: packingLists } = usePackingLists();

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="container py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">lock</span>
        <p className="text-muted-foreground">Bitte melde dich an, um ein Event zu erstellen.</p>
      </div>
    );
  }

  const selectedLocation = locations?.find((l) => l.id === selectedLocationId) ?? null;

  // --- Navigation ---

  function canGoNext(): boolean {
    if (step === 0) return name.trim().length > 0;
    return true;
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  // --- Location creation ---

  async function handleCreateLocation() {
    if (!newLocation.name.trim()) return;
    createLocation.mutate(newLocation, {
      onSuccess: (loc) => {
        setSelectedLocationId(loc.id);
        setShowNewLocationForm(false);
        setNewLocation({ name: '', street: '', zip_code: '', city: '', state: '', country: 'Deutschland', description: '' });
      },
    });
  }

  // --- Add booking option ---

  function handleAddBookingOption() {
    if (!editingOption.name.trim()) return;
    setBookingOptions((prev) => [...prev, { ...editingOption }]);
    setEditingOption({ name: '', description: '', price: '0.00', max_participants: 0 });
  }

  function handleRemoveBookingOption(index: number) {
    setBookingOptions((prev) => prev.filter((_, i) => i !== index));
  }

  // --- AI Invitation ---

  function handleGenerateInvitation() {
    generateInvitation.mutate(
      {
        name,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        location_name: selectedLocation?.name ?? '',
        location_address: selectedLocation
          ? [selectedLocation.street, selectedLocation.zip_code, selectedLocation.city]
              .filter(Boolean)
              .join(', ')
          : '',
        booking_options: bookingOptions.map((o) => `${o.name} (${o.price}€)`),
        special_notes: specialNotes,
      },
      {
        onSuccess: (data) => setInvitationText(data.invitation_text),
      },
    );
  }

  // --- Save ---

  async function handleSave() {
    createEvent.mutate(
      {
        name: name.trim(),
        description: invitationText || description,
        location: selectedLocation
          ? `${selectedLocation.name}, ${selectedLocation.city}`
          : '',
        event_location_id: selectedLocationId,
        invitation_text: invitationText,
        start_date: startDate || null,
        end_date: endDate || null,
        registration_deadline: registrationDeadline || null,
        is_public: isPublic,
        packing_list_id: packingListId,
        booking_options: bookingOptions.length > 0
          ? bookingOptions.map((o) => ({
              name: o.name,
              description: o.description,
              price: o.price,
              max_participants: o.max_participants,
            }))
          : undefined,
      },
      {
        onSuccess: () => navigate(`/events/app`),
      },
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all',
                  i < step
                    ? 'gradient-primary text-white'
                    : i === step
                    ? 'gradient-primary text-white shadow-glow'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i < step ? (
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">check</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{s.icon}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-1 sm:mt-1.5 text-[10px] sm:text-xs font-medium text-center',
                  i === step ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-colors',
                  i < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Grunddaten */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Grunddaten</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Gib deinem Event einen Namen und lege die Daten fest.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event-Name *</label>
              <input
                type="text"
                placeholder="z.B. Sommerlager 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Kurze Beschreibung des Events..."
                height={200}
                preview="edit"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enddatum</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Anmeldeschluss</label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              Öffentlich sichtbar
            </label>

            {/* Packing List selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Packliste (optional)</label>
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
              <p className="text-xs text-muted-foreground mt-1">
                Verknüpfe eine Packliste mit diesem Event.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Ort */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Veranstaltungsort</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle einen bestehenden Ort aus oder lege einen neuen an.
            </p>
          </div>

          {/* Existing locations */}
          {locationsLoading ? (
            <p className="text-sm text-muted-foreground">Orte laden...</p>
          ) : locations && locations.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Bestehende Orte</label>
              <div className="grid gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedLocationId(loc.id === selectedLocationId ? null : loc.id);
                      setShowNewLocationForm(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm',
                      selectedLocationId === loc.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'hover:bg-muted border-border'
                    )}
                  >
                    <div className="font-medium">{loc.name}</div>
                    <div className={cn(
                      'text-xs mt-0.5',
                      selectedLocationId === loc.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {[loc.street, loc.zip_code, loc.city].filter(Boolean).join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Orte vorhanden.</p>
          )}

          {/* New location button / form */}
          {!showNewLocationForm ? (
            <button
              onClick={() => {
                setShowNewLocationForm(true);
                setSelectedLocationId(null);
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">add_location</span>
              Neuen Ort anlegen
            </button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">add_location</span>
                Neuen Ort anlegen
              </h4>
              <input
                type="text"
                placeholder="Name des Ortes *"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              />
              <input
                type="text"
                placeholder="Straße + Hausnummer"
                value={newLocation.street}
                onChange={(e) => setNewLocation({ ...newLocation, street: e.target.value })}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="PLZ"
                  value={newLocation.zip_code}
                  onChange={(e) => setNewLocation({ ...newLocation, zip_code: e.target.value })}
                  className="px-3 py-2 rounded-md border text-sm bg-background"
                />
                <input
                  type="text"
                  placeholder="Stadt"
                  value={newLocation.city}
                  onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-md border text-sm bg-background"
                />
              </div>
              <input
                type="text"
                placeholder="Bundesland"
                value={newLocation.state}
                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              />
              <textarea
                placeholder="Beschreibung / Hinweise zum Ort"
                value={newLocation.description}
                onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLocation}
                  disabled={!newLocation.name.trim() || createLocation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                >
                  {createLocation.isPending ? 'Speichere...' : 'Ort speichern'}
                </button>
                <button
                  onClick={() => setShowNewLocationForm(false)}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
                >
                  Abbrechen
                </button>
              </div>
              {createLocation.isError && (
                <p className="text-xs text-destructive">{createLocation.error.message}</p>
              )}
            </div>
          )}

          {/* Selected location summary */}
          {selectedLocation && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Ausgewählt: {selectedLocation.name}
              </div>
              <p className="text-xs text-muted-foreground">
                {[selectedLocation.street, selectedLocation.zip_code, selectedLocation.city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Buchungsoptionen */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Buchungsoptionen</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lege Buchungsoptionen an (z.B. Tagesticket, Wochenende, mit Übernachtung).
              Du kannst diesen Schritt auch überspringen.
            </p>
          </div>

          {/* Option list */}
          {bookingOptions.length > 0 && (
            <div className="space-y-2">
              {bookingOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{opt.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{opt.price}€</span>
                    {opt.max_participants > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (max. {opt.max_participants})
                      </span>
                    )}
                    {opt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveBookingOption(idx)}
                    className="text-destructive hover:underline text-xs"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add option form */}
          <div className="border rounded-lg p-4 space-y-3 bg-card">
            <h4 className="text-sm font-semibold">Neue Option hinzufügen</h4>
            <input
              type="text"
              placeholder="Name der Option *"
              value={editingOption.name}
              onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            />
            <input
              type="text"
              placeholder="Beschreibung (optional)"
              value={editingOption.description}
              onChange={(e) => setEditingOption({ ...editingOption, description: e.target.value })}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Preis (€)</label>
                <input
                  type="number"
                  value={editingOption.price}
                  onChange={(e) => setEditingOption({ ...editingOption, price: e.target.value })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 rounded-md border text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max. Teilnehmer (0=∞)</label>
                <input
                  type="number"
                  value={editingOption.max_participants}
                  onChange={(e) => setEditingOption({ ...editingOption, max_participants: Number(e.target.value) })}
                  min="0"
                  className="w-full px-3 py-2 rounded-md border text-sm bg-background"
                />
              </div>
            </div>
            <button
              onClick={handleAddBookingOption}
              disabled={!editingOption.name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Einladungstext */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Einladungstext</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Schreibe besondere Hinweise und lass die KI einen schönen Einladungstext generieren.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Besonderheiten & Hinweise</label>
            <textarea
              placeholder="z.B. Bitte Schlafsack und Isomatte mitbringen, Lagerfeuer am Samstag, veganes Essen verfügbar..."
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background resize-none"
            />
          </div>

          <button
            onClick={handleGenerateInvitation}
            disabled={generateInvitation.isPending}
            className="px-4 py-2 gradient-primary text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            {generateInvitation.isPending ? 'KI generiert...' : 'Einladungstext generieren'}
          </button>
          {generateInvitation.isError && (
            <p className="text-xs text-destructive">{generateInvitation.error.message}</p>
          )}

          {invitationText && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Generierter Einladungstext</label>
              <div className="border rounded-lg p-4 bg-card text-sm">
                <MarkdownRenderer content={invitationText} />
              </div>
              <p className="text-xs text-muted-foreground">
                Du kannst den Text nach dem Erstellen im Event bearbeiten.
              </p>
            </div>
          )}

          {/* Preview summary */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Zusammenfassung
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-1 font-medium">{name}</span>
              </div>
              {startDate && (
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <span className="ml-1">
                    {new Date(startDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {endDate && (
                <div>
                  <span className="text-muted-foreground">Ende:</span>
                  <span className="ml-1">
                    {new Date(endDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {selectedLocation && (
                <div>
                  <span className="text-muted-foreground">Ort:</span>
                  <span className="ml-1">{selectedLocation.name}, {selectedLocation.city}</span>
                </div>
              )}
              {bookingOptions.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Buchungsoptionen:</span>
                  <span className="ml-1">
                    {bookingOptions.map((o) => `${o.name} (${o.price}€)`).join(', ')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Sichtbarkeit:</span>
                <span className="ml-1">{isPublic ? 'Öffentlich' : 'Nur eingeladene'}</span>
              </div>
              {packingListId && packingLists && (
                <div>
                  <span className="text-muted-foreground">Packliste:</span>
                  <span className="ml-1">
                    {packingLists.find((pl) => pl.id === packingListId)?.title ?? 'Unbekannt'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="px-4 py-2 border rounded-md text-sm hover:bg-muted disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Zurück
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            Weiter
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={createEvent.isPending || !name.trim()}
            className="px-6 py-2 gradient-primary text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">celebration</span>
            {createEvent.isPending ? 'Erstelle...' : 'Event erstellen'}
          </button>
        )}
      </div>

      {createEvent.isError && (
        <p className="text-sm text-destructive mt-4 text-center">{createEvent.error.message}</p>
      )}
    </div>
  );
}
