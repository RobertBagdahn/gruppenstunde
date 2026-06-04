import { useState } from 'react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';

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

  const defaultFactors = {
    breakfast: 0.20,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.10,
    drinks: 0.00,
  };
  const [factors, setFactors] = useState<Record<string, number>>(plan.day_part_factors || defaultFactors);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold">Einstellungen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Portionen (Personen)</label>
          <input
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reservefaktor</label>
          <input
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={reserve}
            onChange={(e) => setReserve(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Budget (€/Person/Tag)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={budget}
            onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="z.B. 8.00"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ende (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={endDatetime}
            onChange={(e) => setEndDatetime(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-3">Tagesanteil-Faktoren für Mahlzeiten</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(factors).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1 capitalize">
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
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Summe der Faktoren: <span className={Math.abs(Object.values(factors).reduce((a, b) => a + b, 0) - 1.0) < 0.001 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
            {Object.values(factors).reduce((a, b) => a + b, 0).toFixed(2)}
          </span> (Sollte idealerweise 1,00 ergeben).
        </p>
      </div>

      <div className="flex justify-end">
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
          })}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
