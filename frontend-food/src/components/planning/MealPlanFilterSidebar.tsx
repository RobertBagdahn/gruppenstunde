import {
  MEALPLAN_ORIGIN_OPTIONS,
  MEALPLAN_WHEN_OPTIONS,
  MEALPLAN_SIZE_OPTIONS,
  MEALPLAN_DURATION_OPTIONS,
  MEALPLAN_VISIBILITY_OPTIONS,
} from '@/schemas/mealPlan';
import { Icon } from '@/components/ui/icon';
import { FilterCheckbox, FilterGroup, FilterRadio, FilterSidebar, MoreFilters } from '@/components/shared/FilterParts';

export interface MealPlanSidebarValues {
  origin: string;
  when: string;
  size: string;
  duration: string;
  visibility: string;
  withMembers: boolean;
  withEvent: boolean;
  tags: string[];
}

interface MealPlanFilterSidebarProps {
  values: MealPlanSidebarValues;
  availableTags: string[];
  activeCount: number;
  onChange: (partial: Partial<MealPlanSidebarValues>) => void;
  onReset: () => void;
}

interface RadioGroupProps {
  title: string;
  icon: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string; icon?: string }[];
  onChange: (value: string) => void;
}

function RadioGroup({ title, icon, name, value, options, onChange }: RadioGroupProps) {
  return (
    <FilterGroup title={title} icon={icon}>
      {options.map((opt) => (
        <FilterRadio
          key={opt.value}
          name={name}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          icon={opt.icon}
          label={opt.label}
        />
      ))}
    </FilterGroup>
  );
}

export default function MealPlanFilterSidebar({
  values,
  availableTags,
  activeCount,
  onChange,
  onReset,
}: MealPlanFilterSidebarProps) {
  const toggleTag = (tag: string) =>
    onChange({
      tags: values.tags.includes(tag) ? values.tags.filter((t) => t !== tag) : [...values.tags, tag],
    });

  // Filters behind "Weitere Filter" that differ from their default (first option).
  const hiddenActiveCount =
    Number(values.size !== MEALPLAN_SIZE_OPTIONS[0].value) +
    Number(values.duration !== MEALPLAN_DURATION_OPTIONS[0].value) +
    Number(values.visibility !== MEALPLAN_VISIBILITY_OPTIONS[0].value) +
    Number(values.withMembers) +
    Number(values.withEvent) +
    values.tags.length;

  return (
    <FilterSidebar activeCount={activeCount}>
      {activeCount > 0 && (
        <button onClick={onReset} className="flex items-center gap-1 text-caption font-medium text-primary hover:underline">
          <Icon name="close" size={16} />
          Alle Filter löschen
        </button>
      )}

      <RadioGroup
        title="Zeitraum"
        icon="calendar_month"
        name="when"
        value={values.when}
        options={MEALPLAN_WHEN_OPTIONS}
        onChange={(when) => onChange({ when })}
      />
      <RadioGroup
        title="Herkunft"
        icon="verified"
        name="origin"
        value={values.origin}
        options={MEALPLAN_ORIGIN_OPTIONS}
        onChange={(origin) => onChange({ origin })}
      />

      <MoreFilters activeCount={hiddenActiveCount}>
        <RadioGroup
          title="Gruppengröße"
          icon="groups"
          name="size"
          value={values.size}
          options={MEALPLAN_SIZE_OPTIONS}
          onChange={(size) => onChange({ size })}
        />
        <RadioGroup
          title="Dauer"
          icon="schedule"
          name="duration"
          value={values.duration}
          options={MEALPLAN_DURATION_OPTIONS}
          onChange={(duration) => onChange({ duration })}
        />
        <RadioGroup
          title="Sichtbarkeit"
          icon="visibility"
          name="visibility"
          value={values.visibility}
          options={MEALPLAN_VISIBILITY_OPTIONS}
          onChange={(visibility) => onChange({ visibility })}
        />

        <FilterGroup title="Eigenschaften" icon="tune">
          <FilterCheckbox
            checked={values.withMembers}
            onChange={() => onChange({ withMembers: !values.withMembers })}
            label="Mit Teilnehmerliste"
          />
          <FilterCheckbox
            checked={values.withEvent}
            onChange={() => onChange({ withEvent: !values.withEvent })}
            label="Mit Veranstaltung"
          />
        </FilterGroup>

        {availableTags.length > 0 && (
          <FilterGroup title="Ernährung" icon="eco">
            <div className="flex flex-wrap gap-1.5 px-1">
              {availableTags.map((tag) => {
                const selected = values.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
                      selected ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-card hover:bg-primary-soft'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </FilterGroup>
        )}
      </MoreFilters>
    </FilterSidebar>
  );
}
