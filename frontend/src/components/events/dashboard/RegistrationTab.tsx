/**
 * RegistrationTab — Register, update, or unregister for an event.
 * Shows registration form when not registered, current registration when registered.
 * Phase-aware: disables form outside registration phase.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail } from '@/schemas/event';
import { usePersons, useRegisterForEvent, useRemoveParticipant } from '@/api/events';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  event: EventDetail;
}

const PHASE_MESSAGES: Record<string, string> = {
  draft: 'Das Event befindet sich noch im Entwurf. Eine Anmeldung ist noch nicht möglich.',
  pre_registration: 'Die Anmeldephase hat noch nicht begonnen.',
  pre_event: 'Die Anmeldephase ist beendet.',
  running: 'Das Event läuft bereits. Eine Anmeldung ist nicht mehr möglich.',
  completed: 'Das Event ist abgeschlossen.',
};

export default function RegistrationTab({ event }: Props) {
  const isRegistrationOpen = event.phase === 'registration';
  const myReg = event.my_registration;

  return (
    <div className="space-y-6">
      {/* Phase message when registration is not open */}
      {!isRegistrationOpen && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">info</span>
          <p className="text-sm text-amber-700">
            {PHASE_MESSAGES[event.phase] || 'Die Anmeldung ist derzeit nicht möglich.'}
          </p>
        </div>
      )}

      {/* Current registration */}
      {myReg && myReg.participants.length > 0 && (
        <CurrentRegistration event={event} />
      )}

      {/* Registration form (only during registration phase and if not yet registered) */}
      {isRegistrationOpen && (!myReg || myReg.participants.length === 0) && (
        <RegisterForm event={event} />
      )}

      {/* Add more participants to existing registration */}
      {isRegistrationOpen && myReg && myReg.participants.length > 0 && (
        <RegisterForm event={event} isAdditional />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current Registration Display
// ---------------------------------------------------------------------------

function CurrentRegistration({ event }: Props) {
  const myReg = event.my_registration;
  const removeParticipant = useRemoveParticipant(event.slug);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [showUnregisterAll, setShowUnregisterAll] = useState(false);

  if (!myReg) return null;

  const handleRemove = (participantId: number) => {
    removeParticipant.mutate(participantId, {
      onSuccess: () => {
        toast.success('Teilnehmer abgemeldet');
        setConfirmRemoveId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const handleUnregisterAll = () => {
    // Remove all participants sequentially
    const ids = myReg.participants.map((p) => p.id);
    let idx = 0;
    const removeNext = () => {
      if (idx >= ids.length) {
        toast.success('Abmeldung erfolgreich');
        setShowUnregisterAll(false);
        return;
      }
      removeParticipant.mutate(ids[idx], {
        onSuccess: () => {
          idx++;
          removeNext();
        },
        onError: (err) => {
          toast.error('Fehler beim Abmelden', { description: err.message });
          setShowUnregisterAll(false);
        },
      });
    };
    removeNext();
  };

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
        Deine Anmeldung
      </h3>

      <div className="space-y-2">
        {myReg.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
            <div>
              <span className="font-medium">{p.first_name} {p.last_name}</span>
              {p.booking_option_name && (
                <span className="text-muted-foreground ml-2">({p.booking_option_name})</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  p.is_paid
                    ? 'text-emerald-600 flex items-center gap-1 text-xs'
                    : 'text-amber-600 flex items-center gap-1 text-xs'
                }
              >
                <span className="material-symbols-outlined text-[14px]">
                  {p.is_paid ? 'check_circle' : 'pending'}
                </span>
                {p.is_paid ? 'Bezahlt' : 'Ausstehend'}
              </span>
              {event.phase === 'registration' && (
                <button
                  onClick={() => setConfirmRemoveId(p.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Teilnehmer entfernen"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unregister all button */}
      {event.phase === 'registration' && myReg.participants.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={() => setShowUnregisterAll(true)}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">person_remove</span>
            Komplett abmelden
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemoveId !== null}
        onConfirm={() => confirmRemoveId && handleRemove(confirmRemoveId)}
        onCancel={() => setConfirmRemoveId(null)}
        title="Teilnehmer entfernen?"
        description="Der Teilnehmer wird aus der Anmeldung entfernt."
        confirmLabel="Entfernen"
        loading={removeParticipant.isPending}
      />

      <ConfirmDialog
        open={showUnregisterAll}
        onConfirm={handleUnregisterAll}
        onCancel={() => setShowUnregisterAll(false)}
        title="Komplett abmelden?"
        description={`Alle ${myReg.participants.length} Teilnehmer werden aus der Anmeldung entfernt.`}
        confirmLabel="Abmelden"
        loading={removeParticipant.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration Form
// ---------------------------------------------------------------------------

function RegisterForm({ event, isAdditional }: Props & { isAdditional?: boolean }) {
  const { data: persons, isLoading: personsLoading } = usePersons();
  const registerMutation = useRegisterForEvent(event.slug);
  const [selectedPersons, setSelectedPersons] = useState<
    { personId: number; bookingOptionId: number | null }[]
  >([]);

  // Filter out persons that are already registered
  const registeredPersonIds = new Set(
    event.my_registration?.participants.map((p) => p.person_id) ?? [],
  );
  const availablePersons = (persons ?? []).filter((p) => !registeredPersonIds.has(p.id));

  const availableOptions = event.booking_options.filter((opt) => !opt.is_full || opt.is_system);

  const addPerson = (personId: number) => {
    if (selectedPersons.find((s) => s.personId === personId)) return;
    const defaultOption = availableOptions.length > 0 ? availableOptions[0].id : null;
    setSelectedPersons([...selectedPersons, { personId, bookingOptionId: defaultOption }]);
  };

  const removePerson = (personId: number) => {
    setSelectedPersons(selectedPersons.filter((s) => s.personId !== personId));
  };

  const setBookingOption = (personId: number, optionId: number | null) => {
    setSelectedPersons(
      selectedPersons.map((s) =>
        s.personId === personId ? { ...s, bookingOptionId: optionId } : s,
      ),
    );
  };

  const handleSubmit = () => {
    if (selectedPersons.length === 0) return;
    registerMutation.mutate(
      {
        persons: selectedPersons.map((s) => ({
          person_id: s.personId,
          booking_option_id: s.bookingOptionId,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Anmeldung erfolgreich');
          setSelectedPersons([]);
        },
        onError: (err) => toast.error('Anmeldung fehlgeschlagen', { description: err.message }),
      },
    );
  };

  if (personsLoading) {
    return (
      <div className="rounded-xl border p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">
          {isAdditional ? 'person_add' : 'app_registration'}
        </span>
        {isAdditional ? 'Weitere Personen anmelden' : 'Anmeldung'}
      </h3>

      {availablePersons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine weiteren Personen zum Anmelden verfügbar. Erstelle zuerst eine Person in deinem Profil.
        </p>
      ) : (
        <>
          {/* Person selection */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-medium text-muted-foreground">Person auswählen</label>
            <div className="flex flex-wrap gap-2">
              {availablePersons
                .filter((p) => !selectedPersons.find((s) => s.personId === p.id))
                .map((person) => (
                  <button
                    key={person.id}
                    onClick={() => addPerson(person.id)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    {person.first_name} {person.last_name}
                  </button>
                ))}
            </div>
          </div>

          {/* Selected persons with booking option */}
          {selectedPersons.length > 0 && (
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-muted-foreground">Ausgewählte Personen</label>
              {selectedPersons.map((sel) => {
                const person = persons?.find((p) => p.id === sel.personId);
                if (!person) return null;
                return (
                  <div key={sel.personId} className="flex items-center gap-3 border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {person.first_name} {person.last_name}
                      </span>
                    </div>
                    {availableOptions.length > 1 && (
                      <select
                        value={sel.bookingOptionId ?? ''}
                        onChange={(e) =>
                          setBookingOption(sel.personId, e.target.value ? Number(e.target.value) : null)
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 bg-background"
                      >
                        {availableOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} ({parseFloat(opt.price).toFixed(2)}&euro;)
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => removePerson(sel.personId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={selectedPersons.length === 0 || registerMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
          >
            {registerMutation.isPending
              ? 'Wird angemeldet...'
              : `${selectedPersons.length} Person${selectedPersons.length !== 1 ? 'en' : ''} anmelden`}
          </button>
        </>
      )}
    </div>
  );
}
