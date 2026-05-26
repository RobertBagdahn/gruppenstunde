/**
 * Step 4: Anmeldung — registration period, visibility, guest registration toggle, deadline.
 */
import { useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';

export default function StepRegistration() {
  const { data, updateStep4, setStepValid } = useEventWizardStore();

  // Always valid (all optional)
  useEffect(() => {
    setStepValid(3, true);
  }, [setStepValid]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Anmeldung</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Lege den Anmeldezeitraum und die Sichtbarkeit deines Events fest.
        </p>
      </div>

      {/* Registration period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Anmeldung ab</label>
          <input
            type="datetime-local"
            value={data.registration_start || ''}
            onChange={(e) => updateStep4({ registration_start: e.target.value || null })}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ab wann können sich Teilnehmer anmelden?
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Anmeldeschluss</label>
          <input
            type="datetime-local"
            value={data.registration_deadline || ''}
            onChange={(e) => updateStep4({ registration_deadline: e.target.value || null })}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Bis wann sind Anmeldungen möglich?
          </p>
        </div>
      </div>

      {/* Visibility toggles */}
      <div className="space-y-4 border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-semibold">Sichtbarkeit & Zugang</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.is_public || false}
            onChange={(e) => updateStep4({ is_public: e.target.checked })}
            className="rounded mt-0.5"
          />
          <div>
            <span className="text-sm font-medium">Öffentlich sichtbar</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Das Event kann von jedem gefunden und angesehen werden.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.guest_registration_enabled || false}
            onChange={(e) => updateStep4({ guest_registration_enabled: e.target.checked })}
            className="rounded mt-0.5"
          />
          <div>
            <span className="text-sm font-medium">Gastanmeldung erlauben</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personen ohne Account können sich über einen Link anmelden.
            </p>
          </div>
        </label>
      </div>

      {/* Info */}
      <div className="border rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 text-sm">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">tips_and_updates</span>
          <div className="text-amber-900 dark:text-amber-200">
            <p className="font-medium">Tipp</p>
            <p className="text-xs mt-0.5">
              Lasse den Anmeldezeitraum leer, um die Anmeldung sofort zu öffnen und offen zu lassen.
              Du kannst dies jederzeit im Dashboard ändern.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
