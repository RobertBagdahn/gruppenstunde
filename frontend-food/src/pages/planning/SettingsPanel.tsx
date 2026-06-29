import { useState } from 'react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import NutritionalTagMultiSelect from '@/components/recipe/NutritionalTagMultiSelect';

interface SettingsPanelProps {
  plan: {
    name: string;
    description: string;
    norm_portions: number;
    reserve_factor: number;
    budget_per_person_per_day: number | null;
    start_datetime: string | null;
    end_datetime: string | null;
    day_part_factors?: Record<string, number>;
    meal_default_times?: Record<string, string[]>;
    nutritional_tag_ids?: number[];
  };
    onSave: (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    reserve_factor?: number;
    budget_per_person_per_day?: number | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    day_part_factors?: Record<string, number>;
    meal_default_times?: Record<string, string[]>;
    nutritional_tag_ids?: number[];
  }) => void;
  isPending: boolean;
}

export default function SettingsPanel({
  plan,
  onSave,
  isPending,
}: SettingsPanelProps) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [portions, setPortions] = useState(plan.norm_portions);
  const [reserve, setReserve] = useState(plan.reserve_factor);
  const [budget, setBudget] = useState(plan.budget_per_person_per_day ?? '');
  const [startDatetime, setStartDatetime] = useState(plan.start_datetime ? plan.start_datetime.slice(0, 16) : '');
  const [endDatetime, setEndDatetime] = useState(plan.end_datetime ? plan.end_datetime.slice(0, 16) : '');
  const [nutritionalTagIds, setNutritionalTagIds] = useState<number[]>(plan.nutritional_tag_ids || []);

  const toggleTag = (tagId: number) => {
    setNutritionalTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const defaultTimes: Record<string, [string, string]> = {
    breakfast: ['08:00', '09:00'],
    lunch: ['12:00', '13:00'],
    dinner: ['18:00', '19:00'],
    snack: ['15:00', '15:30'],
  };
  const [mealTimes, setMealTimes] = useState<Record<string, [string, string]>>(
    plan.meal_default_times ? Object.fromEntries(
      Object.entries(plan.meal_default_times).map(([k, v]) => [k, [v[0] || '12:00', v[1] || '13:00'] as [string, string]])
    ) : defaultTimes
  );

  const defaultFactors = {
    breakfast: 0.30,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.10,
  };
  const [factors, setFactors] = useState<Record<string, number>>(plan.day_part_factors || defaultFactors);

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-soft font-sans">
      <h3 className="font-display font-bold text-lg text-foreground">Einstellungen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Portionen (Personen)</label>
          <input
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Reservefaktor</label>
          <input
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={reserve}
            onChange={(e) => setReserve(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Budget (€/Person/Tag)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={budget}
            onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="z.B. 8.00"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Start (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Ende (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={endDatetime}
            onChange={(e) => setEndDatetime(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h4 className="font-display font-bold text-sm text-foreground mb-3">Tagesanteil-Faktoren für Mahlzeiten</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(factors).map(([key, value]) => (
            <div key={key}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 capitalize">
                {MEAL_TYPE_LABELS[key] || key}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={value}
                onChange={(e) => {
                  const newval = Number(e.target.value);
                  setFactors(prev => ({ ...prev, [key]: newval }));
                }}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          Summe der Faktoren:{' '}
          <span className={Math.abs(Object.values(factors).reduce((a, b) => a + b, 0) - 1.0) < 0.001 ? "text-primary font-bold" : "text-accent font-bold"}>
            {Object.values(factors).reduce((a, b) => a + b, 0).toFixed(2)}
          </span> (Sollte idealerweise 1,00 ergeben).
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <h4 className="font-display font-bold text-sm text-foreground mb-3">Standard-Uhrzeiten pro Mahlzeit</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(mealTimes).map(([key, [start, end]]) => (
            <div key={key}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 capitalize">
                {MEAL_TYPE_LABELS[key] || key}
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setMealTimes(prev => ({ ...prev, [key]: [e.target.value, prev[key][1]] }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                />
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setMealTimes(prev => ({ ...prev, [key]: [prev[key][0], e.target.value] }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h4 className="font-display font-bold text-sm text-foreground mb-3">Ernährungseinschränkungen</h4>
        <NutritionalTagMultiSelect selectedTagIds={nutritionalTagIds} onToggle={toggleTag} />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onSave({
            name,
            description,
            norm_portions: portions,
            reserve_factor: reserve,
            budget_per_person_per_day: budget === '' ? null : Number(budget),
            start_datetime: startDatetime ? startDatetime + ':00' : null,
            end_datetime: endDatetime ? endDatetime + ':00' : null,
            day_part_factors: factors,
            meal_default_times: mealTimes,
            nutritional_tag_ids: nutritionalTagIds,
          })}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
        >
          {isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
