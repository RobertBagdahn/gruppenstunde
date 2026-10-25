import { Settings2 } from 'lucide-react';
import { MEAL_TYPE_LABELS, type MealPlanWizardState } from '@/schemas/mealPlan';
import { formatNumber } from '@/lib/format';
import { RESERVE_FACTOR_HINT } from '@/lib/mealPlanBounds';
import { validateBasics } from './validateBasics';
import { SuggestionContextFields } from '@/components/planning/suggestions/SuggestionContextFields';
import WizardSectionHeading from './WizardSectionHeading';
import { WIZARD_ERROR_CLASS, WIZARD_INPUT_CLASS, WIZARD_LABEL_CLASS } from './wizardStyles';

interface ExtendedSettingsSectionProps {
  state: MealPlanWizardState;
  onChange: (patch: Partial<MealPlanWizardState>) => void;
}

// Time inputs sit side by side in a narrow column, so they use less horizontal padding.
const TIME_INPUT_CLASS =
  'min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/30 md:text-body';

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
  const limitErrors = validateBasics(state);

  return (
    <div className="space-y-5 border-t border-border pt-6">
      <WizardSectionHeading icon={<Settings2 className="h-5 w-5" />}>Erweiterte Einstellungen</WizardSectionHeading>

      <div>
        <label htmlFor="wiz-ext-1" className={WIZARD_LABEL_CLASS}>Beschreibung</label>
        <textarea id="wiz-ext-1"
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/30 md:text-body"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="wiz-ext-2" className={WIZARD_LABEL_CLASS}>Reservefaktor</label>
          <input id="wiz-ext-2"
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={state.reserve_factor}
            onChange={(e) => onChange({ reserve_factor: Number(e.target.value) })}
            aria-invalid={limitErrors.reserve ? true : undefined}
            className={WIZARD_INPUT_CLASS}
          />
          <p role={limitErrors.reserve ? 'alert' : undefined} className={`mt-1 text-caption ${limitErrors.reserve ? 'text-danger-foreground' : 'text-muted-foreground'}`}>
            {limitErrors.reserve ?? RESERVE_FACTOR_HINT}
          </p>
        </div>
        <div>
          <label htmlFor="wiz-ext-3" className={WIZARD_LABEL_CLASS}>Budget (€/Person/Tag)</label>
          <input id="wiz-ext-3"
            type="number"
            min={0}
            step={0.5}
            value={state.budget_per_person_per_day ?? ''}
            onChange={(e) => onChange({ budget_per_person_per_day: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="z.B. 8.00"
            className={WIZARD_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="wiz-ext-4" className={WIZARD_LABEL_CLASS}>Sichtbarkeit</label>
          <select id="wiz-ext-4"
            value={state.visibility}
            onChange={(e) => onChange({ visibility: e.target.value as MealPlanWizardState['visibility'] })}
            className={WIZARD_INPUT_CLASS}
          >
            <option value="private">Privat</option>
            <option value="group">Gruppe</option>
            <option value="public">Öffentlich</option>
            <option value="draft">Entwurf</option>
          </select>
        </div>
      </div>

      <SuggestionContextFields
        value={{
          age_groups: state.age_groups,
          setting: state.setting,
          cooking_sources: state.cooking_sources,
          cooling: state.cooling,
          season_hint: state.season_hint,
        }}
        onChange={onChange}
      />

      <label className="flex min-h-11 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={state.is_template}
          onChange={(e) => onChange({ is_template: e.target.checked })}
          className="h-5 w-5 rounded-sm border-border text-primary focus:ring-primary/50"
        />
        <span className="text-body font-medium text-foreground">
          Als Vorlage markieren
        </span>
      </label>

      <div>
        <h5 className="mb-2 font-display text-body font-bold text-foreground">Tagesanteil-Faktoren</h5>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mealTypes.map((type) => (
            <div key={type}>
              <label className={`${WIZARD_LABEL_CLASS} mb-1 capitalize`}>
                {MEAL_TYPE_LABELS[type] || type}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={state.day_part_factors[type] ?? 0.25}
                onChange={(e) => updateFactor(type, Number(e.target.value))}
                className={WIZARD_INPUT_CLASS}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-caption font-medium text-muted-foreground">
          Summe:{' '}
          <span className={Math.abs(factorsSum - 1.0) < 0.001 ? 'font-bold text-primary' : 'font-bold text-warning'}>
            {formatNumber(factorsSum, { maxDecimals: 2 })}
          </span>
          {' '}(Sollte idealerweise 1,00 ergeben)
        </p>
        {limitErrors.dayParts && <p role="alert" className={WIZARD_ERROR_CLASS}>{limitErrors.dayParts}</p>}
      </div>

      <div>
        <h5 className="mb-2 font-display text-body font-bold text-foreground">Standard-Uhrzeiten</h5>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mealTypes.map((type) => {
            const times = state.meal_default_times[type] || ['08:00', '09:00'];
            return (
              <div key={type} data-testid={`meal-time-group-${type}`} className="min-w-0">
                <label className={`${WIZARD_LABEL_CLASS} mb-1 capitalize`}>
                  {MEAL_TYPE_LABELS[type] || type}
                </label>
                <div className="flex min-w-0 gap-1.5 sm:gap-2">
                  <input
                    type="time"
                    value={times[0] || '08:00'}
                    onChange={(e) => updateTime(type, 0, e.target.value)}
                    className={TIME_INPUT_CLASS}
                  />
                  <input
                    type="time"
                    value={times[1] || '09:00'}
                    onChange={(e) => updateTime(type, 1, e.target.value)}
                    className={TIME_INPUT_CLASS}
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
