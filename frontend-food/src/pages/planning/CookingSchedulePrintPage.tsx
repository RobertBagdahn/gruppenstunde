import { useParams } from 'react-router-dom';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { Loader2 } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CookingScheduleIngredient, CookingScheduleItem, CookingScheduleDay, CookingScheduleStep } from '@/schemas/mealPlan';

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

function formatCurrency(amount: number): string {
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function IngredientRow({ ing }: { ing: CookingScheduleIngredient }) {
  const parts = [ing.quantity, ing.unit, ing.name].filter(Boolean);
  const detail = ing.note ? ` (${ing.note})` : '';
  if (ing.is_optional) {
    return (
      <li className="flex items-baseline gap-1.5 py-0.5 text-[10.5px] text-gray-500 italic">
        <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 mt-1" />
        <span>{parts.join(' ')}{detail} <span className="text-[9px]">(optional)</span></span>
      </li>
    );
  }
  return (
    <li className="flex items-baseline gap-1.5 py-0.5 text-[10.5px]">
      <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0 mt-1" />
      <span>{parts.join(' ')}{detail}</span>
    </li>
  );
}

function AllergenBadges({ tags }: { tags: { name: string; is_dangerous?: boolean }[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((tag) => (
        <span
          key={tag.name}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
            tag.is_dangerous ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          {tag.is_dangerous ? '⚠ ' : ''}{tag.name}
        </span>
      ))}
    </div>
  );
}

function NutritionBadge({ item }: { item: CookingScheduleItem }) {
  const hasNutrition = item.total_energy_kcal > 0 || item.total_protein_g > 0 || item.total_fat_g > 0 || item.total_carbohydrate_g > 0;
  if (!hasNutrition) return null;
  const perPortion = item.portions > 0 ? item.total_energy_kcal / item.portions : 0;
  return (
    <div className="text-[9px] text-gray-500 mt-1">
      {Math.round(perPortion)} kcal/Port.
      {item.total_protein_g > 0 && ` · ${Math.round(item.total_protein_g / item.portions)}g P`}
      {item.total_fat_g > 0 && ` · ${Math.round(item.total_fat_g / item.portions)}g F`}
      {item.total_carbohydrate_g > 0 && ` · ${Math.round(item.total_carbohydrate_g / item.portions)}g KH`}
    </div>
  );
}

function StepList({ steps }: { steps: CookingScheduleStep[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol className="list-decimal list-inside space-y-1 text-[10.5px] leading-relaxed text-gray-700">
      {steps.map((step, i) => (
        <li key={i} className="pl-1">
          <span className="whitespace-pre-line">{step.text.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')}</span>
          {step.timer && <span className="text-gray-400 ml-1">(⏱ {step.timer} Min.)</span>}
        </li>
      ))}
    </ol>
  );
}

function RecipeCard({ item }: { item: CookingScheduleItem }) {
  const hasIngredients = item.ingredients.length > 0;
  const hasSteps = item.steps_parsed.length > 0 || item.steps.trim().length > 0;
  const hasCost = item.total_cost_eur > 0;
  const hasAllergens = item.nutritional_tags.length > 0;
  const mealLabel = MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type;

  return (
    <div className="break-inside-avoid print:break-before-always print:pt-0">
      <div className="border border-gray-300 rounded-lg overflow-hidden print:rounded-none print:border-l-0 print:border-r-0 print:border-t-0">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-semibold shrink-0">
            {mealLabel}
          </div>
          <div className="font-bold tabular-nums text-gray-900 text-sm shrink-0">
            {formatTime(item.start_time)}
          </div>
          <div className="text-gray-400 text-[10px] shrink-0">
            – {formatTime(item.serving_time)} ({item.lead_minutes} Min.)
          </div>
          <div className="font-semibold text-sm flex-1">
            {item.recipe_title}
          </div>
          <div className="text-gray-500 text-[10px] shrink-0">
            {item.portions} Port.
          </div>
          {hasCost && (
            <div className="text-[10px] text-gray-600 shrink-0 font-medium">
              {formatCurrency(item.total_cost_eur)}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5">
          {hasAllergens && (
            <AllergenBadges tags={item.nutritional_tags} />
          )}

          <NutritionBadge item={item} />

          {item.meal_note && (
            <div className="mt-1.5 text-[10px] text-amber-700 italic">
              📝 {item.meal_note}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mt-2">
            {hasIngredients && (
              <div>
                <h4 className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">
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
                      <li className="text-[9px] text-gray-400 italic pt-1 pb-0.5">Optional:</li>
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

            <div className={hasIngredients ? '' : 'col-span-2'}>
              {hasSteps && (
                <>
                  <h4 className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">
                    Zubereitung
                  </h4>
                  {item.steps_parsed.length > 0 ? (
                    <StepList steps={item.steps_parsed} />
                  ) : (
                    <div className="text-[10.5px] leading-relaxed text-gray-700 whitespace-pre-line">
                      {item.steps}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayHeader({ day }: { day: CookingScheduleDay }) {
  const allDayAllergens = day.day_nutritional_tags || [];
  const hasAllergens = allDayAllergens.length > 0;
  const hasCost = day.total_cost_eur > 0;

  return (
    <div className="mb-3 pb-2 border-b-2 border-gray-300">
      <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1">
        <h2 className="text-base font-bold text-gray-900">
          {formatDate(day.date)}
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span className="font-medium">👥 {day.portions} Personen</span>
          {day.day_start_time && day.day_end_time && (
            <span>⏱ {day.day_start_time} – {day.day_end_time} ({day.day_duration_minutes} Min.)</span>
          )}
          {hasCost && (
            <span className="font-medium">{formatCurrency(day.total_cost_eur)}</span>
          )}
        </div>
      </div>
      {hasAllergens && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-[9px] text-gray-500 font-medium">Allergene:</span>
          {allDayAllergens.map((tag) => (
            <span
              key={tag.name}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold ${
                tag.is_dangerous ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {tag.is_dangerous ? '⚠ ' : ''}{tag.name}
            </span>
          ))}
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
      <div className="flex justify-center py-20 bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white">
        Kochplan nicht gefunden.
      </div>
    );
  }

  const formatDateRange = () => {
    if (!plan?.start_datetime && !plan?.end_datetime) return '';
    const start = plan?.start_datetime ? format(new Date(plan.start_datetime), 'd. MMMM', { locale: de }) : '';
    const end = plan?.end_datetime ? format(new Date(plan.end_datetime), 'd. MMMM yyyy', { locale: de }) : '';
    return start && end ? `${start} – ${end}` : start || end;
  };

  const allAllergens: { name: string; is_dangerous?: boolean }[] = [];
  const seenNames = new Set<string>();
  for (const day of schedule.days) {
    for (const tag of day.day_nutritional_tags || []) {
      if (!seenNames.has(tag.name)) {
        seenNames.add(tag.name);
        allAllergens.push(tag);
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="max-w-[21cm] mx-auto px-6 py-8 print:px-6 print:py-4">

        {/* ===== Deckblatt ===== */}
        <section className="print:break-after-always mb-8 flex flex-col justify-center min-h-[80vh]">
          <div className="text-center space-y-6">
            <div className="text-5xl mb-4">🍳</div>
            <h1 className="text-4xl font-bold text-gray-900">
              Kochplan
            </h1>
            {plan && (
              <>
                <p className="text-xl text-gray-700 font-medium">{plan.name}</p>
                <div className="flex justify-center gap-6 text-sm text-gray-500">
                  {formatDateRange() && <span>{formatDateRange()}</span>}
                  <span>👥 {plan.norm_portions.toFixed(1)} Personen</span>
                  <span>+{Math.round((plan.reserve_factor - 1) * 100)}% Reserve</span>
                </div>
              </>
            )}

            <div className="w-32 h-0.5 bg-gray-300 mx-auto" />

            {schedule.total_cost_eur > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Gesamtkosten:</span>{' '}
                {formatCurrency(schedule.total_cost_eur)}
                {schedule.total_cost_with_reserve > 0 && schedule.total_cost_with_reserve !== schedule.total_cost_eur && (
                  <span className="text-gray-400 ml-1">
                    (mit Reserve: {formatCurrency(schedule.total_cost_with_reserve)})
                  </span>
                )}
              </div>
            )}

            {schedule.total_energy_kcal > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Gesamtenergie:</span>{' '}
                {Math.round(schedule.total_energy_kcal).toLocaleString('de-DE')} kcal
                {plan && schedule.total_energy_kcal > 0 && plan.norm_portions > 0 && (
                  <span className="text-gray-400 ml-1">
                    ({Math.round(schedule.total_energy_kcal / plan.norm_portions).toLocaleString('de-DE')} kcal/Person)
                  </span>
                )}
              </div>
            )}

            {schedule.excluded_meal_count > 0 && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
                Hinweis: {schedule.excluded_meal_count}{' '}
                {schedule.excluded_meal_count === 1 ? 'Mahlzeit wurde' : 'Mahlzeiten wurden'} nicht berücksichtigt.
              </div>
            )}

            {allAllergens.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">Enthaltene Allergene / Ernährungshinweise:</p>
                <div className="flex justify-center flex-wrap gap-1.5">
                  {allAllergens.map((tag) => (
                    <span
                      key={tag.name}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        tag.is_dangerous ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {tag.is_dangerous ? '⚠ ' : ''}{tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {plan?.description && (
              <p className="text-sm text-gray-500 italic max-w-md mx-auto">{plan.description}</p>
            )}
          </div>
        </section>

        {/* ===== Tage & Rezepte ===== */}
        {schedule.days.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Keine Rezepte im Kochplan.</p>
          </div>
        ) : (
          schedule.days.map((day) => (
            <section key={day.date} className="mb-6">
              <DayHeader day={day} />
              <div className="space-y-0">
                {day.items.map((item, idx) => (
                  <RecipeCard key={`${item.recipe_slug}-${idx}`} item={item} />
                ))}
              </div>
            </section>
          ))
        )}

        {/* ===== Footer ===== */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between print:fixed print:bottom-0 print:left-0 print:right-0 print:px-6 print:py-2 print:bg-white">
          <span>Inspi — {window.location.origin}/meal-plans/{id}/cooking-schedule</span>
          <button
            onClick={() => window.print()}
            className="print:hidden text-blue-600 underline text-xs"
          >
            Drucken
          </button>
        </div>
      </div>
    </div>
  );
}
