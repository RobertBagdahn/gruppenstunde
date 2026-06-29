import { Calendar, Users, Sparkles, Copy, FileText, DollarSign, Tag } from 'lucide-react';
import type { MealPlanWizardState } from '@/schemas/mealPlan';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';

interface StepCockpitProps {
  state: MealPlanWizardState;
  nutritionalTagNames: string[];
  onCreate: () => void;
  isPending: boolean;
}

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return 'Kein Datum angegeben';
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  if (start && end) {
    if (start.slice(0, 10) === end.slice(0, 10)) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start) return `ab ${fmt(start)}`;
  return `bis ${fmt(end)}`;
}

export default function StepCockpit({ state, nutritionalTagNames, onCreate, isPending }: StepCockpitProps) {
  const daysCount = (() => {
    if (!state.start_datetime || !state.end_datetime) return 0;
    const start = new Date(state.start_datetime);
    const end = new Date(state.end_datetime);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const strategyLabel = {
    empty: 'Leerer Plan (Grundgerüst)',
    reference: `Kopie von "${state.reference_plan_name}"`,
    ai: 'KI-generierte Vorschläge',
  }[state.strategy];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
        <h3 className="font-display font-bold text-lg text-foreground">Zusammenfassung</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</p>
              <p className="text-sm font-semibold text-foreground">{state.name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Personen</p>
              <p className="text-sm font-semibold text-foreground">{state.norm_portions}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Zeitraum</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDateRange(state.start_datetime, state.end_datetime)}
                {daysCount > 0 && <span className="text-muted-foreground"> ({daysCount} Tage)</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ernährung</p>
              <p className="text-sm font-semibold text-foreground">
                {nutritionalTagNames.length > 0 ? nutritionalTagNames.join(', ') : 'Keine Einschränkungen'}
              </p>
            </div>
          </div>

          {state.budget_per_person_per_day != null && (
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Budget</p>
                <p className="text-sm font-semibold text-foreground">{state.budget_per_person_per_day.toFixed(2)} €/Person/Tag</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-soft">
        <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
          {state.strategy === 'ai' ? (
            <Sparkles className="w-4 h-4 text-primary" />
          ) : state.strategy === 'reference' ? (
            <Copy className="w-4 h-4 text-primary" />
          ) : (
            <FileText className="w-4 h-4 text-primary" />
          )}
          Befüllungs-Strategie
        </h4>
        <p className="text-sm font-semibold text-foreground">{strategyLabel}</p>

        {state.strategy === 'empty' && (
          <p className="text-xs text-muted-foreground">
            Der Plan wird mit leeren Mahlzeiten erstellt. Du kannst später Rezepte zuordnen.
          </p>
        )}

        {state.strategy === 'ai' && state.ai_suggestions && (
          <div className="space-y-2 mt-2">
            {(state.ai_suggestions as { days: { date: string; meals: { meal_type: string; recipe_title: string }[] }[] }).days.map((day: { date: string; meals: { meal_type: string; recipe_title: string }[] }) => (
              <div key={day.date} className="border border-border rounded-lg p-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.meals.map((meal, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {meal.recipe_title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={!state.name.trim() || isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
      >
        {isPending ? 'Erstelle...' : 'Essensplan erstellen'}
      </button>
    </div>
  );
}
