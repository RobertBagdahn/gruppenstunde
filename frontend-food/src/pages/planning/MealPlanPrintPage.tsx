/**
 * MealPlanPrintPage — Dedizierte Druckansicht für Essenspläne.
 * Route: /meal-plans/:id/print
 *
 * A4-optimiert, kein App-Layout, alle Tage und Mahlzeiten ausgeklappt.
 * Öffne in neuem Tab, dann Browser-Drucken (Strg+P).
 */
import { useParams } from 'react-router-dom';
import { useMealPlan } from '@/api/mealPlans';
import { Loader2 } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'EEEE, d. MMMM yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

export default function MealPlanPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, error } = useMealPlan(Number(id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Essensplan nicht gefunden.
      </div>
    );
  }

  type Meal = typeof plan.meals[number];

  // Group meals by date
  const mealsByDate: Record<string, Meal[]> = {};
  for (const meal of plan.meals ?? []) {
    const date = meal.start_datetime?.slice(0, 10) ?? 'Unbekannt';
    if (!mealsByDate[date]) mealsByDate[date] = [];
    mealsByDate[date].push(meal);
  }
  const sortedDates = Object.keys(mealsByDate).sort();

  const formatDateRange = () => {
    if (!plan.start_datetime && !plan.end_datetime) return '';
    const start = plan.start_datetime ? format(new Date(plan.start_datetime), 'd. MMMM', { locale: de }) : '';
    const end = plan.end_datetime ? format(new Date(plan.end_datetime), 'd. MMMM yyyy', { locale: de }) : '';
    return start && end ? `${start} – ${end}` : start || end;
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="max-w-[21cm] mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-1">{plan.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
            {formatDateRange() && <span>{formatDateRange()}</span>}
            <span>{plan.norm_portions} Personen</span>
            <span>+{Math.round((plan.reserve_factor - 1) * 100)}% Reserve</span>
          </div>
          {plan.description && (
            <p className="mt-2 text-sm text-gray-700 italic">{plan.description}</p>
          )}
        </div>

        {/* Tage & Mahlzeiten */}
        {sortedDates.length === 0 ? (
          <p className="text-gray-500">Keine Mahlzeiten geplant.</p>
        ) : (
          sortedDates.map((date) => {
            const meals = mealsByDate[date];
            return (
              <section key={date} className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
                  {formatDate(date + 'T12:00:00')}
                </h2>
                <div className="space-y-4">
                  {[...meals]
                    .sort((a: Meal, b: Meal) => (a.start_datetime ?? '').localeCompare(b.start_datetime ?? ''))
                    .map((meal: Meal) => (
                      <div key={meal.id} className="pl-4 border-l-2 border-gray-300">
                        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-1">
                          {MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}
                          {meal.start_datetime && (
                            <span className="font-normal normal-case ml-2">
                              ({format(new Date(meal.start_datetime), 'HH:mm')} Uhr)
                            </span>
                          )}
                        </h3>
                        {(meal.items?.length ?? 0) > 0 ? (
                          <ul className="space-y-0.5 text-sm">
                            {meal.items?.map((item) => (
                              <li key={item.id} className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                <span className="font-medium">
                                  {item.recipe_title ?? item.ingredient_name ?? '–'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Keine Rezepte</p>
                        )}
                      </div>
                    ))}
                </div>
              </section>
            );
          })
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
          <span>Inspi — {window.location.origin}/meal-plans/{id}</span>
          <button
            onClick={() => window.print()}
            className="print:hidden text-blue-600 underline"
          >
            Drucken
          </button>
        </div>
      </div>
    </div>
  );
}
