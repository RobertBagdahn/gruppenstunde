import { CalendarDays, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { MEAL_PLAN_NAME_MAX_LENGTH, type MealPlanWizardState } from '@/schemas/mealPlan';
import NutritionalTagMultiSelect from '@/components/recipe/NutritionalTagMultiSelect';
import ExtendedSettingsSection from './ExtendedSettingsSection';
import { validateBasics } from './validateBasics';
import WizardSectionHeading from './WizardSectionHeading';
import { WIZARD_ERROR_CLASS, WIZARD_INPUT_CLASS, WIZARD_LABEL_CLASS } from './wizardStyles';

interface StepBasicSettingsProps {
  state: MealPlanWizardState;
  extendedVisible: boolean;
  onToggleExtended: () => void;
  onChange: (patch: Partial<MealPlanWizardState>) => void;
}

export default function StepBasicSettings({
  state,
  extendedVisible,
  onToggleExtended,
  onChange,
}: StepBasicSettingsProps) {
  const toggleTag = (tagId: number) => {
    const ids = state.nutritional_tag_ids;
    onChange({
      nutritional_tag_ids: ids.includes(tagId)
        ? ids.filter((id) => id !== tagId)
        : [...ids, tagId],
    });
  };

  const errors = validateBasics(state);

  return (
    <div className="space-y-6">
      <div>
        <WizardSectionHeading icon={<CalendarDays className="h-5 w-5" />}>Eckdaten</WizardSectionHeading>
        <div className="space-y-4">
          <div>
            <label htmlFor="wiz-basic-1" className={WIZARD_LABEL_CLASS}>Name *</label>
            <input id="wiz-basic-1"
              type="text"
              value={state.name}
              maxLength={MEAL_PLAN_NAME_MAX_LENGTH}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="z.B. Sommerlager 2026"
              className={WIZARD_INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="wiz-basic-2" className={WIZARD_LABEL_CLASS}>Portionen (Personen)</label>
              <input id="wiz-basic-2"
                type="number"
                min={1}
                value={state.norm_portions}
                onChange={(e) => onChange({ norm_portions: Number(e.target.value) })}
                aria-invalid={!!errors.portions}
                className={WIZARD_INPUT_CLASS}
              />
              {errors.portions && <p className={WIZARD_ERROR_CLASS} role="alert">{errors.portions}</p>}
            </div>
            <div>
              <label htmlFor="wiz-basic-3" className={WIZARD_LABEL_CLASS}>Start (Datum & Uhrzeit)</label>
              <input id="wiz-basic-3"
                type="datetime-local"
                value={state.start_datetime}
                onChange={(e) => onChange({ start_datetime: e.target.value })}
                className={WIZARD_INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="wiz-basic-4" className={WIZARD_LABEL_CLASS}>Ende (Datum & Uhrzeit)</label>
              <input id="wiz-basic-4"
                type="datetime-local"
                value={state.end_datetime}
                onChange={(e) => onChange({ end_datetime: e.target.value })}
                aria-invalid={!!errors.period}
                className={WIZARD_INPUT_CLASS}
              />
              {errors.period && <p className={WIZARD_ERROR_CLASS} role="alert">{errors.period}</p>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <WizardSectionHeading icon={<Utensils className="h-5 w-5" />}>Ernährung</WizardSectionHeading>
        <p className={WIZARD_LABEL_CLASS}>Ernährungseinschränkungen</p>
        <NutritionalTagMultiSelect selectedTagIds={state.nutritional_tag_ids} onToggle={toggleTag} />
      </div>

      <button
        type="button"
        onClick={onToggleExtended}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/70"
      >
        {extendedVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {extendedVisible ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen anzeigen'}
      </button>

      {extendedVisible && (
        <ExtendedSettingsSection state={state} onChange={onChange} />
      )}
    </div>
  );
}
