import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicEvent, useGuestRegistration, useGenderChoices } from '@/api/events';
import { cn } from '@/lib/utils';
import type { GuestRegistrationPerson } from '@/schemas/event';

// ---------------------------------------------------------------------------
// Person Form Row
// ---------------------------------------------------------------------------

interface PersonFormProps {
  index: number;
  person: GuestRegistrationPerson;
  bookingOptions: { id: number; name: string; price: string; is_bookable: boolean; is_system: boolean }[];
  genderChoices: { value: string; label: string }[];
  onChange: (index: number, updated: GuestRegistrationPerson) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function PersonForm({
  index,
  person,
  bookingOptions,
  genderChoices,
  onChange,
  onRemove,
  canRemove,
}: PersonFormProps) {
  const availableOptions = bookingOptions.filter(
    (opt) => opt.is_bookable && !opt.is_system,
  );

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">person</span>
          Person {index + 1}
        </h4>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Vorname *
          </label>
          <input
            type="text"
            value={person.first_name}
            onChange={(e) => onChange(index, { ...person, first_name: e.target.value })}
            required
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
            value={person.last_name}
            onChange={(e) => onChange(index, { ...person, last_name: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
            placeholder="Nachname"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Pfadfindername
          </label>
          <input
            type="text"
            value={person.scout_name ?? ''}
            onChange={(e) => onChange(index, { ...person, scout_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
            placeholder="optional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Geburtstag
          </label>
          <input
            type="date"
            value={person.birthday ?? ''}
            onChange={(e) =>
              onChange(index, { ...person, birthday: e.target.value || null })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Geschlecht
          </label>
          <select
            value={person.gender ?? 'no_answer'}
            onChange={(e) => onChange(index, { ...person, gender: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
          >
            {genderChoices.length > 0 ? (
              genderChoices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))
            ) : (
              <>
                <option value="no_answer">Keine Angabe</option>
                 <option value="male">Männlich</option>
                <option value="female">Weiblich</option>
                <option value="diverse">Divers</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Telefonnummer
        </label>
        <input
          type="tel"
          value={person.phone_number ?? ''}
          onChange={(e) => onChange(index, { ...person, phone_number: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
          placeholder="+49 151 12345678"
        />
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Optional. Ermoeglicht Benachrichtigungen per WhatsApp.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Buchungsoption *
        </label>
        {availableOptions.length > 0 ? (
          <select
            value={person.booking_option_id ?? ''}
            onChange={(e) =>
              onChange(index, { ...person, booking_option_id: Number(e.target.value) })
            }
            required
            className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
          >
            <option value="" disabled>
               Bitte wählen...
            </option>
            {availableOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name} ({parseFloat(opt.price).toFixed(2)} &euro;)
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-muted-foreground">
             Keine Buchungsoptionen verfügbar.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function emptyPerson(): GuestRegistrationPerson {
  return {
    first_name: '',
    last_name: '',
    scout_name: '',
    birthday: null,
    gender: 'no_answer',
    phone_number: '',
    booking_option_id: 0,
  };
}

export default function GuestRegistrationPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = usePublicEvent(slug);
  const { data: genderChoices } = useGenderChoices();
  const guestRegistration = useGuestRegistration(slug);

  const [persons, setPersons] = useState<GuestRegistrationPerson[]>([emptyPerson()]);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState<{ email: string; count: number } | null>(null);

  // --- Loading / Error / Not Found ---

  if (isLoading) {
    return (
      <div className="container py-16 max-w-lg mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded-lg w-2/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-48 bg-muted rounded-xl mt-6" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container py-16 text-center max-w-lg">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">
          error
        </span>
        <h2 className="text-lg font-bold mb-2">Event nicht gefunden</h2>
        <p className="text-sm text-muted-foreground">
           Das Event existiert nicht oder ist nicht öffentlich.
        </p>
      </div>
    );
  }

  // --- Check if guest registration is available ---

  if (!event.guest_registration_enabled) {
    return (
      <div className="container py-16 text-center max-w-lg">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">
          block
        </span>
         <h2 className="text-lg font-bold mb-2">Gastregistrierung nicht verfügbar</h2>
         <p className="text-sm text-muted-foreground">
           Für dieses Event ist die Gastregistrierung nicht aktiviert.
        </p>
      </div>
    );
  }

  if (event.phase !== 'registration') {
    return (
      <div className="container py-16 text-center max-w-lg">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">
          schedule
        </span>
         <h2 className="text-lg font-bold mb-2">Anmeldung nicht möglich</h2>
        <p className="text-sm text-muted-foreground">
          {event.phase === 'draft' || event.phase === 'pre_registration'
             ? 'Die Anmeldung für dieses Event hat noch nicht begonnen.'
             : 'Die Anmeldung für dieses Event ist leider abgelaufen.'}
        </p>
      </div>
    );
  }

  // --- Success State ---

  if (success) {
    return (
      <div className="container py-16 text-center max-w-lg">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8">
          <span className="material-symbols-outlined text-[48px] text-green-600 mb-3 block">
            check_circle
          </span>
          <h2 className="text-xl font-bold mb-2 text-green-800 dark:text-green-300">
            Anmeldung erfolgreich!
          </h2>
          <p className="text-sm text-green-700 dark:text-green-400">
            {success.count === 1
              ? '1 Person wurde erfolgreich angemeldet.'
              : `${success.count} Personen wurden erfolgreich angemeldet.`}
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
            Eine Bestaetigung wurde an <strong>{success.email}</strong> gesendet.
          </p>
        </div>
      </div>
    );
  }

  // --- Handlers ---

  const handlePersonChange = (index: number, updated: GuestRegistrationPerson) => {
    setPersons((prev) => prev.map((p, i) => (i === index ? updated : p)));
  };

  const handleRemovePerson = (index: number) => {
    setPersons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPerson = () => {
    setPersons((prev) => [...prev, emptyPerson()]);
  };

  const isFormValid = () => {
    if (!email.trim() || !email.includes('@')) return false;
    return persons.every(
      (p) => p.first_name.trim() && p.last_name.trim() && p.booking_option_id > 0,
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    guestRegistration.mutate(
      { persons, email },
      {
        onSuccess: (data) => {
          setSuccess({ email: data.email, count: data.participant_count });
        },
      },
    );
  };

  // --- Booking options (filtered for guests) ---
  const bookingOptions = event.booking_options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    price: opt.price,
    is_bookable: opt.is_bookable,
    is_system: opt.is_system,
  }));

  const availableBookingOptions = bookingOptions.filter(
    (opt) => opt.is_bookable && !opt.is_system,
  );

  // --- Render ---

  return (
    <div className="container py-8 max-w-2xl">
      {/* Event Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
        <p className="text-sm text-muted-foreground">Anmeldung als Gast</p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
          {event.start_date && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {new Date(event.start_date).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              {event.end_date && (
                <>
                  {' \u2013 '}
                  {new Date(event.end_date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </>
              )}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {event.location}
            </div>
          )}
        </div>

        {/* Meeting & Pickup Points */}
        {(event.meeting_point || event.pickup_point) && (
          <div className="mt-4 border rounded-xl p-4 text-left max-w-md mx-auto space-y-2">
            {event.meeting_point && (
              <div className="flex items-start gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px] mt-0.5 text-green-600">trip_origin</span>
                <div>
                  <p className="font-medium">Treffpunkt: {event.meeting_point.name}</p>
                  <p className="text-xs text-muted-foreground">{event.meeting_point.full_address}</p>
                </div>
              </div>
            )}
            {event.pickup_point && (
              <div className="flex items-start gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px] mt-0.5 text-red-600">flag</span>
                <div>
                  <p className="font-medium">Abholpunkt: {event.pickup_point.name}</p>
                  <p className="text-xs text-muted-foreground">{event.pickup_point.full_address}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {availableBookingOptions.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-[48px] text-muted-foreground mb-3 block">
            block
          </span>
           <h2 className="text-lg font-bold mb-2">Keine Buchungsoptionen verfügbar</h2>
          <p className="text-sm text-muted-foreground">
            Momentan sind keine Buchungsoptionen buchbar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Person Forms */}
          {persons.map((person, index) => (
            <PersonForm
              key={index}
              index={index}
              person={person}
              bookingOptions={bookingOptions}
              genderChoices={genderChoices ?? []}
              onChange={handlePersonChange}
              onRemove={handleRemovePerson}
              canRemove={persons.length > 1}
            />
          ))}

          {/* Add person button */}
          <button
            type="button"
            onClick={handleAddPerson}
            className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
             Weitere Person hinzufügen
          </button>

          {/* Email */}
          <div className="border rounded-xl p-4 bg-card">
            <label className="block text-sm font-medium mb-2">
              E-Mail-Adresse *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
              placeholder="deine@email.de"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              An diese Adresse wird die Anmeldebestaetigung gesendet.
            </p>
          </div>

          {/* Error */}
          {guestRegistration.isError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {guestRegistration.error.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid() || guestRegistration.isPending}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-semibold transition-all',
              'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
              'hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {guestRegistration.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Anmeldung wird gesendet...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                {persons.length === 1 ? '1 Person anmelden' : `${persons.length} Personen anmelden`}
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
