/**
 * CookingSchedulePage — Chronologische Kochplan-Übersicht für einen Essensplan.
 * Route: /meal-plans/:id/cooking-schedule
 *
 * Zeigt pro Tag alle zu kochenden Rezepte mit berechneter Startzeit
 * (rückwärts von der Servierzeit).
 */
import { useParams, Link } from 'react-router-dom';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { BackButton } from '@/components/shared/BackButton';
import { Loader2, Printer, Info, ChefHat, Clock } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function formatTime(isoString: string): string {
  try {
    return format(new Date(isoString), 'HH:mm');
  } catch {
    return '–';
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'EEEE, d. MMMM yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
  lunch: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  dinner: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  snack: 'bg-rose-100 text-rose-800 border-rose-200',
  drink: 'bg-sky-100 text-sky-800 border-sky-200',
};

export default function CookingSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id);
  const { data: plan, isLoading: planLoading } = useMealPlan(mealPlanId);
  const { data: schedule, isLoading: scheduleLoading, error } = useCookingSchedule(mealPlanId);

  const isLoading = planLoading || scheduleLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Kochplan konnte nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton to={`/meal-plans/${id}`} />
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-primary" />
              Kochplan
            </h1>
            {plan && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.name}</p>
            )}
          </div>
        </div>
        <a
          href={`/meal-plans/${id}/cooking-schedule/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-bold bg-card hover:bg-muted/50 transition-all shadow-soft shrink-0"
          title="Druckansicht öffnen"
        >
          <Printer className="w-4 h-4" />
          Drucken
        </a>
      </div>

      {/* Hinweis: ausgeschlossene Mahlzeiten */}
      {schedule.excluded_meal_count > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {schedule.excluded_meal_count}{' '}
            {schedule.excluded_meal_count === 1
              ? 'Mahlzeit wurde'
              : 'Mahlzeiten wurden'}{' '}
            nicht berücksichtigt (keine Servierzeit gesetzt oder externe Mahlzeit).
          </span>
        </div>
      )}

      {/* Leerer Zustand */}
      {schedule.days.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <ChefHat className="w-12 h-12 mx-auto opacity-30" />
          <p className="font-medium">Keine Rezepte im Kochplan</p>
          <p className="text-sm">
            Plane Mahlzeiten mit Servierzeit, damit der Kochplan berechnet werden kann.
          </p>
        </div>
      )}

      {/* Tage */}
      {schedule.days.map((day) => (
        <section key={day.date} className="space-y-3">
          <h2 className="text-base font-display font-bold text-foreground border-b border-border pb-2">
            {formatDate(day.date)}
          </h2>

          {/* Tabelle */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[5rem_5rem_1fr_5rem_8rem_4.5rem] gap-3 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Start</span>
              <span>Servierzeit</span>
              <span>Rezept</span>
              <span className="text-right">Dauer</span>
              <span>Mahlzeit</span>
              <span className="text-right">Portionen</span>
            </div>

            {/* Zeilen */}
            <div className="divide-y divide-border">
              {day.items.map((item, idx) => (
                <div
                  key={`${item.recipe_slug}-${idx}`}
                  className="grid grid-cols-1 md:grid-cols-[5rem_5rem_1fr_5rem_8rem_4.5rem] gap-2 md:gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
                >
                  {/* Startzeit */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary md:hidden" />
                    <span className="font-bold text-sm text-primary tabular-nums">
                      {formatTime(item.start_time)} Uhr
                    </span>
                  </div>

                  {/* Servierzeit */}
                  <div className="text-sm text-muted-foreground tabular-nums md:block hidden">
                    {formatTime(item.serving_time)} Uhr
                  </div>
                  <div className="md:hidden text-xs text-muted-foreground">
                    Servieren: {formatTime(item.serving_time)} Uhr
                  </div>

                  {/* Rezeptname */}
                  <div>
                    <Link
                      to={`/recipes/${item.recipe_slug}`}
                      className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.recipe_title}
                    </Link>
                  </div>

                  {/* Dauer */}
                  <div className="text-sm text-muted-foreground md:text-right">
                    <span className="md:hidden text-xs">Dauer: </span>
                    {item.lead_minutes} Min.
                  </div>

                  {/* Mahlzeit-Typ */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        MEAL_TYPE_COLORS[item.meal_type] ?? 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type}
                    </span>
                  </div>

                  {/* Portionen */}
                  <div className="text-sm text-muted-foreground md:text-right">
                    <span className="md:hidden text-xs">Portionen: </span>
                    {item.portions}×
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
