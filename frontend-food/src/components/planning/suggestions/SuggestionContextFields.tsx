import type {
  AgeGroup,
  CookingSource,
  PlanCooling,
  PlanSeasonHint,
  PlanSetting,
} from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';

export interface SuggestionContextValue {
  age_groups: AgeGroup[];
  setting: PlanSetting;
  cooking_sources: CookingSource[];
  cooling: PlanCooling;
  season_hint: PlanSeasonHint;
}

export const EMPTY_SUGGESTION_CONTEXT: SuggestionContextValue = {
  age_groups: [],
  setting: '',
  cooking_sources: [],
  cooling: '',
  season_hint: '',
};

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: 'toddlers', label: 'Kleinkinder (unter 6)' },
  { value: 'children', label: 'Kinder (6–11)' },
  { value: 'teens', label: 'Jugendliche (12–17)' },
  { value: 'adults', label: 'Erwachsene' },
];

const COOKING_OPTIONS: { value: CookingSource; label: string }[] = [
  { value: 'stove_oven', label: 'Herd / Ofen' },
  { value: 'gas_burner', label: 'Gaskocher' },
  { value: 'campfire', label: 'Lagerfeuer' },
  { value: 'grill', label: 'Grill' },
  { value: 'none', label: 'Nichts' },
];

const SETTING_OPTIONS: { value: PlanSetting; label: string }[] = [
  { value: 'camp', label: 'Zeltlager' },
  { value: 'house_trip', label: 'Hausfahrt' },
  { value: 'day_event', label: 'Tagesaktion' },
  { value: 'group_meeting', label: 'Gruppenstunde' },
  { value: 'hike', label: 'Wanderung' },
  { value: 'other', label: 'Sonstiges' },
];

const COOLING_OPTIONS: { value: PlanCooling; label: string }[] = [
  { value: 'fridge', label: 'Kühlschrank' },
  { value: 'cooler_box', label: 'Kühlbox' },
  { value: 'none', label: 'Keine Kühlung' },
];

const SEASON_OPTIONS: { value: PlanSeasonHint; label: string }[] = [
  { value: 'hot', label: 'Heiß' },
  { value: 'mild', label: 'Mild' },
  { value: 'cold', label: 'Kalt' },
];

const SELECT_CLASS =
  'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft';
const LABEL_CLASS = 'block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1.5';

function ToggleChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={LABEL_CLASS}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-caption font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted/60',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface SuggestionContextFieldsProps {
  value: SuggestionContextValue;
  onChange: (patch: Partial<SuggestionContextValue>) => void;
}

/** Optional plan context that improves the meal suggestions. Missing values are asked in the assistant. */
export function SuggestionContextFields({ value, onChange }: SuggestionContextFieldsProps) {
  const toggleAge = (group: AgeGroup) =>
    onChange({
      age_groups: value.age_groups.includes(group)
        ? value.age_groups.filter((g) => g !== group)
        : [...value.age_groups, group],
    });

  const toggleCooking = (source: CookingSource) => {
    if (source === 'none') {
      onChange({ cooking_sources: value.cooking_sources.includes('none') ? [] : ['none'] });
      return;
    }
    const without = value.cooking_sources.filter((s) => s !== 'none');
    onChange({
      cooking_sources: without.includes(source) ? without.filter((s) => s !== source) : [...without, source],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h5 className="font-display font-bold text-caption text-foreground">Für bessere Menüvorschläge (optional)</h5>
        <p className="text-caption text-muted-foreground">
          Was hier fehlt, fragt dich der Assistent bei „Was passt hier?“ einmalig ab.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="suggestion-setting" className={LABEL_CLASS}>
            Veranstaltungsart
          </label>
          <select
            id="suggestion-setting"
            value={value.setting}
            onChange={(e) => onChange({ setting: e.target.value as PlanSetting })}
            className={SELECT_CLASS}
          >
            <option value="">Nicht angegeben</option>
            {SETTING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="suggestion-cooling" className={LABEL_CLASS}>
            Kühlmöglichkeit
          </label>
          <select
            id="suggestion-cooling"
            value={value.cooling}
            onChange={(e) => onChange({ cooling: e.target.value as PlanCooling })}
            className={SELECT_CLASS}
          >
            <option value="">Nicht angegeben</option>
            {COOLING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="suggestion-season" className={LABEL_CLASS}>
            Wetter
          </label>
          <select
            id="suggestion-season"
            value={value.season_hint}
            onChange={(e) => onChange({ season_hint: e.target.value as PlanSeasonHint })}
            className={SELECT_CLASS}
          >
            <option value="">Aus dem Startdatum ableiten</option>
            {SEASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ToggleChips
        label="Altersgruppen"
        options={AGE_GROUP_OPTIONS}
        selected={value.age_groups}
        onToggle={toggleAge}
      />
      <ToggleChips
        label="Kochmöglichkeiten"
        options={COOKING_OPTIONS}
        selected={value.cooking_sources}
        onToggle={toggleCooking}
      />
    </div>
  );
}
