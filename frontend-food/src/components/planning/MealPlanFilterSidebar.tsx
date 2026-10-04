import { useState } from 'react';
import {
  MEALPLAN_ORIGIN_OPTIONS,
  MEALPLAN_WHEN_OPTIONS,
  MEALPLAN_SIZE_OPTIONS,
  MEALPLAN_DURATION_OPTIONS,
  MEALPLAN_VISIBILITY_OPTIONS,
} from '@/schemas/mealPlan';
import { Icon } from '@/components/ui/icon';

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
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-body font-semibold mb-2 text-primary">
        <Icon name={icon} size={20} />
        {title}
      </h3>
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer text-body hover:text-primary transition-colors">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="border-muted-foreground accent-primary"
          />
          {opt.icon && <Icon name={opt.icon} size={16} />}
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function MealPlanFilterSidebar({
  values,
  availableTags,
  activeCount,
  onChange,
  onReset,
}: MealPlanFilterSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTag = (tag: string) =>
    onChange({
      tags: values.tags.includes(tag) ? values.tags.filter((t) => t !== tag) : [...values.tags, tag],
    });

  return (
    <aside className="w-full md:w-64 shrink-0">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-body"
      >
        <span className="flex items-center gap-2">
          <Icon name="tune" size={20} className="text-primary" />
          Filter
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-caption px-1.5">
              {activeCount}
            </span>
          )}
        </span>
        <Icon name="expand_more" size={20} className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-caption font-semibold text-destructive hover:underline"
          >
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

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-body font-semibold mb-2 text-primary">
            <Icon name="tune" size={20} />
            Eigenschaften
          </h3>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-body">
            <input
              type="checkbox"
              checked={values.withMembers}
              onChange={(e) => onChange({ withMembers: e.target.checked })}
              className="rounded-lg accent-primary"
            />
            Mit Teilnehmerliste
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-body">
            <input
              type="checkbox"
              checked={values.withEvent}
              onChange={(e) => onChange({ withEvent: e.target.checked })}
              className="rounded-lg accent-primary"
            />
            Mit Veranstaltung
          </label>
        </div>

        {availableTags.length > 0 && (
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-body font-semibold mb-2 text-primary">
              <Icon name="eco" size={20} />
              Ernährung
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const selected = values.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2.5 py-1 text-caption font-medium transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
