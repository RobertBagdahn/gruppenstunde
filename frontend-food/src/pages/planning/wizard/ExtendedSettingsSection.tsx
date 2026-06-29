import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { MealPlanWizardState } from '@/schemas/mealPlan';

interface ExtendedSettingsSectionProps {
  state: MealPlanWizardState;
  onChange: (patch: Partial<MealPlanWizardState>) => void;
}

export default function ExtendedSettingsSection({ state, onChange }: ExtendedSettingsSectionProps) {
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  const updateFactor = (key: string, value: number) => {
    onChange({
      day_part_factors: { ...state.day_part_factors, [key]: value },
    });
  };

  const updateTime = (key: string, index: 0 | 1, value: string) => {
    const current = state.meal_default_times[key] || ['08:00', '09:00'];
    const updated = [...current] as [string, string];
    updated[index] = value;
    onChange({
      meal_default_times: { ...state.meal_default_times, [key]: updated },
    });
  };

  const factorsSum = Object.values(state.day_part_factors).reduce((a, b) => a + b, 0);

  return (
    <div className="border border-border rounded-xl bg-card/50 p-4 sm:p-5 space-y-5">
      <h4 className="font-display font-bold text-sm text-foreground">Erweiterte Einstellungen</h4>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Beschreibung</label>
        <textarea
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reservefaktor</label>
          <input
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={state.reserve_factor}
            onChange={(e) => onChange({ reserve_factor: Number(e.target.value) })}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Budget (€/Person/Tag)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={state.budget_per_person_per_day ?? ''}
            onChange={(e) => onChange({ budget_per_person_per_day: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="z.B. 8.00"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Sichtbarkeit</label>
          <select
            value={state.visibility}
            onChange={(e) => onChange({ visibility: e.target.value as MealPlanWizardState['visibility'] })}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          >
            <option value="private">Privat</option>
            <option value="group">Gruppe</option>
            <option value="public">Öffentlich</option>
            <option value="draft">Entwurf</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.is_template}
          onChange={(e) => onChange({ is_template: e.target.checked })}
          className="rounded border-border text-primary focus:ring-primary/50"
        />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Als Vorlage markieren
        </span>
      </label>

      <div>
        <h5 className="font-display font-bold text-xs text-foreground mb-2">Tagesanteil-Faktoren</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mealTypes.map((type) => (
            <div key={type}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 capitalize">
                {MEAL_TYPE_LABELS[type] || type}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={state.day_part_factors[type] ?? 0.25}
                onChange={(e) => updateFactor(type, Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-medium">
          Summe:{' '}
          <span className={Math.abs(factorsSum - 1.0) < 0.001 ? 'text-primary font-bold' : 'text-accent font-bold'}>
            {factorsSum.toFixed(2)}
          </span>
          {' '}(Sollte idealerweise 1,00 ergeben)
        </p>
      </div>

      <div>
        <h5 className="font-display font-bold text-xs text-foreground mb-2">Standard-Uhrzeiten</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mealTypes.map((type) => {
            const times = state.meal_default_times[type] || ['08:00', '09:00'];
            return (
              <div key={type}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 capitalize">
                  {MEAL_TYPE_LABELS[type] || type}
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={times[0] || '08:00'}
                    onChange={(e) => updateTime(type, 0, e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                  />
                  <input
                    type="time"
                    value={times[1] || '09:00'}
                    onChange={(e) => updateTime(type, 1, e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
