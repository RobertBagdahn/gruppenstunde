/**
 * CookingSchedulePrintPage — Dedizierte Druckansicht des Kochplans.
 * Route: /meal-plans/:id/cooking-schedule/print
 *
 * A4-optimiert, kein App-Layout. Zeigt Rezepte mit Zutaten und Schritten.
 */
import { useParams } from 'react-router-dom';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { Loader2 } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CookingScheduleIngredient, CookingScheduleItem } from '@/schemas/mealPlan';

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

function IngredientRow({ ing }: { ing: CookingScheduleIngredient }) {
  const parts = [ing.quantity, ing.unit, ing.name].filter(Boolean);
  const detail = ing.note ? ` (${ing.note})` : '';
  if (ing.is_optional) {
    parts.push('(optional)');
  }
  return (
    <li className="flex items-baseline gap-1.5 py-0.5 text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0 mt-1" />
      <span>
        {parts.join(' ')}{detail}
      </span>
    </li>
  );
}

function RecipeCard({ item }: { item: CookingScheduleItem }) {
  const hasSteps = item.steps.trim().length > 0;
  const hasIngredients = item.ingredients.length > 0;

  return (
    <div className="border border-gray-300 rounded-lg mb-3 break-inside-avoid">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm">
        <div className="font-bold tabular-nums text-gray-900 w-14 shrink-0">
          {formatTime(item.start_time)} Uhr
        </div>
        <div className="text-gray-500 tabular-nums w-14 shrink-0 text-xs">
          {formatTime(item.serving_time)} Uhr
        </div>
        <div className="font-semibold flex-1 text-sm">{item.recipe_title}</div>
        <div className="text-gray-600 text-xs w-16 text-right shrink-0">
          {item.lead_minutes} Min.
        </div>
        <div className="text-gray-600 text-xs w-20 shrink-0 text-right">
          {MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type}
        </div>
        <div className="text-gray-600 text-xs w-14 shrink-0 text-right">
          {item.portions} Port.
        </div>
      </div>

      {/* Body: Ingredients + Steps */}
      {(hasIngredients || hasSteps) && (
        <div className="px-4 py-2.5">
          {hasIngredients && (
            <div className="mb-2">
              <h4 className="text-[11px] font-bold uppercase text-gray-500 tracking-wider mb-1">
                Zutaten
              </h4>
              <ul className="space-y-0">
                {item.ingredients
                  .filter((ing) => !ing.is_optional)
                  .map((ing, i) => (
                    <IngredientRow key={`${ing.name}-${i}`} ing={ing} />
                  ))}
                {item.ingredients.some((ing) => ing.is_optional) && (
                  <>
                    <li className="text-[11px] text-gray-400 italic pt-1">Optional:</li>
                    {item.ingredients
                      .filter((ing) => ing.is_optional)
                      .map((ing, i) => (
                        <IngredientRow key={`opt-${ing.name}-${i}`} ing={ing} />
                      ))}
                  </>
                )}
              </ul>
            </div>
          )}
          {hasSteps && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-gray-500 tracking-wider mb-1">
                Zubereitung
              </h4>
              <div className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-line">
                {item.steps}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CookingSchedulePrintPage() {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id);
  const { data: plan, isLoading: planLoading } = useMealPlan(mealPlanId);
  const { data: schedule, isLoading: scheduleLoading } = useCookingSchedule(mealPlanId);

  if (planLoading || scheduleLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-8 text-center text-gray-500">
        Kochplan nicht gefunden.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="max-w-[21cm] mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🍳</span>
            <h1 className="text-3xl font-bold">Kochplan</h1>
          </div>
          {plan && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              <span>{plan.name}</span>
              <span>{plan.norm_portions} Personen</span>
            </div>
          )}
        </div>

        {/* Hinweis ausgeschlossene Mahlzeiten */}
        {schedule.excluded_meal_count > 0 && (
          <div className="mb-6 p-3 border border-gray-300 rounded text-sm text-gray-600 bg-gray-50">
            Hinweis: {schedule.excluded_meal_count}{' '}
            {schedule.excluded_meal_count === 1 ? 'Mahlzeit wurde' : 'Mahlzeiten wurden'} nicht
            berücksichtigt (keine Servierzeit oder externe Mahlzeit).
          </div>
        )}

        {/* Leerer Zustand */}
        {schedule.days.length === 0 && (
          <p className="text-gray-500">Keine Rezepte im Kochplan.</p>
        )}

        {/* Tage */}
        {schedule.days.map((day) => (
          <section key={day.date} className="mb-8 break-inside-avoid-page">
            <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
              {formatDate(day.date)}
            </h2>

            <div className="space-y-3">
              {day.items.map((item, idx) => (
                <RecipeCard key={`${item.recipe_slug}-${idx}`} item={item} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
          <span>Inspi — {window.location.origin}/meal-plans/{id}/cooking-schedule</span>
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
