import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MealPlanWizardState } from '@/schemas/mealPlan';
import NutritionalTagMultiSelect from '@/components/recipe/NutritionalTagMultiSelect';
import ExtendedSettingsSection from './ExtendedSettingsSection';

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

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Name *</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="z.B. Sommerlager 2026"
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Portionen (Personen)</label>
          <input
            type="number"
            min={1}
            value={state.norm_portions}
            onChange={(e) => onChange({ norm_portions: Number(e.target.value) })}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Start (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={state.start_datetime}
            onChange={(e) => onChange({ start_datetime: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ende (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={state.end_datetime}
            onChange={(e) => onChange({ end_datetime: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ernährungseinschränkungen</label>
        <NutritionalTagMultiSelect selectedTagIds={state.nutritional_tag_ids} onToggle={toggleTag} />
      </div>

      <button
        type="button"
        onClick={onToggleExtended}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        {extendedVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {extendedVisible ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen anzeigen'}
      </button>

      {extendedVisible && (
        <ExtendedSettingsSection state={state} onChange={onChange} />
      )}
    </div>
  );
}
