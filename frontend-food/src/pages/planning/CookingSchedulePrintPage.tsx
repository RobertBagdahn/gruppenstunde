/**
 * CookingSchedulePrintPage — Dedizierte Druckansicht des Kochplans.
 * Route: /meal-plans/:id/cooking-schedule/print
 *
 * A4-optimiert, kein App-Layout, alle Tage ausgeklappt.
 */
import { useParams } from 'react-router-dom';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { Loader2 } from 'lucide-react';
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
          <section key={day.date} className="mb-8 break-inside-avoid">
            <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
              {formatDate(day.date)}
            </h2>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs text-gray-500 uppercase">
                  <th className="py-1.5 pr-3 font-semibold w-20">Start</th>
                  <th className="py-1.5 pr-3 font-semibold w-20">Servieren</th>
                  <th className="py-1.5 pr-3 font-semibold">Rezept</th>
                  <th className="py-1.5 pr-3 font-semibold text-right w-16">Dauer</th>
                  <th className="py-1.5 pr-3 font-semibold w-24">Mahlzeit</th>
                  <th className="py-1.5 font-semibold text-right w-16">Portionen</th>
                </tr>
              </thead>
              <tbody>
                {day.items.map((item, idx) => (
                  <tr
                    key={`${item.recipe_slug}-${idx}`}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-2 pr-3 font-bold text-gray-900 tabular-nums">
                      {formatTime(item.start_time)}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 tabular-nums">
                      {formatTime(item.serving_time)}
                    </td>
                    <td className="py-2 pr-3 font-medium">{item.recipe_title}</td>
                    <td className="py-2 pr-3 text-right text-gray-600">{item.lead_minutes} Min.</td>
                    <td className="py-2 pr-3 text-gray-600">
                      {MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type}
                    </td>
                    <td className="py-2 text-right text-gray-600">{item.portions}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
