import type { ReactNode } from 'react';
import { Calendar, ClipboardCheck, Users, Sparkles, Copy, FileText, DollarSign, Tag } from 'lucide-react';
import { MEAL_TYPE_LABELS, type MealPlanWizardState, type AiSuggestOut } from '@/schemas/mealPlan';
import { formatNumber } from '@/lib/format';
import WizardSectionHeading from './WizardSectionHeading';

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

function SummaryItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-body font-semibold text-foreground">{children}</p>
      </div>
    </div>
  );
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
      <div className="space-y-4 rounded-xl bg-card p-5 shadow-card">
        <WizardSectionHeading icon={<ClipboardCheck className="h-5 w-5" />}>Zusammenfassung</WizardSectionHeading>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryItem icon={<FileText className="h-4 w-4" />} label="Name">
            {state.name || '—'}
          </SummaryItem>

          <SummaryItem icon={<Users className="h-4 w-4" />} label="Personen">
            {state.norm_portions}
          </SummaryItem>

          <SummaryItem icon={<Calendar className="h-4 w-4" />} label="Zeitraum">
            {formatDateRange(state.start_datetime, state.end_datetime)}
            {daysCount > 0 && <span className="text-muted-foreground"> ({daysCount} {daysCount === 1 ? 'Tag' : 'Tage'})</span>}
          </SummaryItem>

          <SummaryItem icon={<Tag className="h-4 w-4" />} label="Ernährung">
            {nutritionalTagNames.length > 0 ? nutritionalTagNames.join(', ') : 'Keine Einschränkungen'}
          </SummaryItem>

          {state.budget_per_person_per_day != null && (
            <SummaryItem icon={<DollarSign className="h-4 w-4" />} label="Budget">
              {formatNumber(state.budget_per_person_per_day, { maxDecimals: 2 })} €/Person/Tag
            </SummaryItem>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-card p-5 shadow-card">
        <h4 className="flex items-center gap-2 font-display text-body font-bold text-foreground">
          {state.strategy === 'ai' ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : state.strategy === 'reference' ? (
            <Copy className="h-4 w-4 text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
          Befüllungs-Strategie
        </h4>
        <p className="text-body font-semibold text-foreground">{strategyLabel}</p>

        {state.strategy === 'empty' && (
          <p className="text-caption text-muted-foreground">
            Der Plan wird mit leeren Mahlzeiten erstellt. Du kannst später Rezepte zuordnen.
          </p>
        )}

        {state.strategy === 'ai' && state.ai_suggestions && (
          <div className="mt-2 space-y-2">
            {(state.ai_suggestions as AiSuggestOut).days.map((day) => (
              <div key={day.date} className="rounded-lg border border-border bg-muted/40 p-2.5">
                <p className="mb-1 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.meals.map((meal, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary-dark">
                      <span className="font-normal opacity-70">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}:</span> {meal.recipe_title}
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
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? 'Erstelle...' : 'Essensplan erstellen'}
      </button>
    </div>
  );
}
