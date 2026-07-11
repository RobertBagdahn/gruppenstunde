import { useState } from 'react';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { Loader2, ChefHat, Clock, ChevronDown, ChevronRight, UtensilsCrossed, ListChecks, AlertTriangle, Users } from 'lucide-react';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, MEAL_TYPE_ICONS_LUCIDE, MEAL_TYPE_COLORS } from '@/schemas/mealPlan';
import type { CookingScheduleItem, CookingScheduleDay, CookingScheduleStep } from '@/schemas/mealPlan';
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

function AllergenChip({ name, isDangerous }: { name: string; isDangerous?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
        isDangerous ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {isDangerous && <AlertTriangle className="w-3 h-3 mr-0.5" />}
      {name}
    </span>
  );
}

function StepView({ steps }: { steps: CookingScheduleStep[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
      {steps.map((step, i) => (
        <li key={i} className="pl-1">
          <span className="whitespace-pre-line">{step.text.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')}</span>
          {step.timer && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 text-xs font-medium text-primary">
              <Clock className="w-3.5 h-3.5" />
              {step.timer} Min.
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function RecipeCardExpanded({ item }: { item: CookingScheduleItem }) {
  const hasIngredients = item.ingredients.length > 0;
  const hasSteps = item.steps_parsed.length > 0 || item.steps.trim().length > 0;
  const hasAllergens = item.nutritional_tags.length > 0;
  const hasCost = item.total_cost_eur > 0;
  const hasNutrition = item.total_energy_kcal > 0;

  return (
    <div className="px-4 pb-4 pt-1 bg-card border-t border-border">
      <div className="grid gap-4 md:grid-cols-2">
        {hasIngredients && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Zutaten ({item.portions} Port.)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.ingredients.map((ing, i) => {
                const parts = [ing.quantity, ing.unit, ing.name].filter(Boolean);
                const detail = ing.note ? ` (${ing.note})` : '';
                return (
                  <span
                    key={`${ing.name}-${i}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border
                      ${ing.is_optional ? 'bg-muted text-muted-foreground border-border italic' : 'bg-primary/5 text-foreground border-primary/10'}`}
                  >
                    {parts.join(' ')}{detail}
                    {ing.is_optional && <span className="text-[10px]">(optional)</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className={hasIngredients ? '' : 'md:col-span-2'}>
          {hasSteps && (
            <>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <ListChecks className="w-3.5 h-3.5" />
                Zubereitung
              </h4>
              {item.steps_parsed.length > 0 ? (
                <StepView steps={item.steps_parsed} />
              ) : (
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.steps}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border/50">
        {hasAllergens && item.nutritional_tags.map((tag) => (
          <AllergenChip key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
        ))}
        {hasCost && (
          <span className="text-xs text-muted-foreground font-medium">
            {item.total_cost_eur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        )}
        {hasNutrition && (
          <span className="text-xs text-muted-foreground">
            {Math.round(item.total_energy_kcal / item.portions)} kcal/Port.
          </span>
        )}
        {item.meal_note && (
          <span className="text-xs text-amber-600 italic">📝 {item.meal_note}</span>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ item }: { item: CookingScheduleItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = item.ingredients.length > 0 || item.steps_parsed.length > 0 || item.steps.trim().length > 0;
  const hasAllergens = item.nutritional_tags.length > 0;

  return (
    <div className="relative pb-4">
      {/* Timeline item card with clean, minimal design - redundant dots removed per design modernization */}
      <div className={`rounded-xl border border-border bg-card shadow-soft overflow-hidden ${expanded ? '' : ''}`}>
        <button
          type="button"
          onClick={() => hasDetails && setExpanded(!expanded)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${expanded ? 'bg-muted/10' : ''}`}
          disabled={!hasDetails}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-bold text-sm text-primary tabular-nums shrink-0 w-12">
              {formatTime(item.start_time)}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(item.serving_time)}
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={`/recipes/${item.recipe_slug}`}
                className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1 block"
                onClick={(e) => e.stopPropagation()}
              >
                {item.recipe_title}
              </a>
              {hasAllergens && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.nutritional_tags.slice(0, 3).map((tag) => (
                    <AllergenChip key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
                  ))}
                  {item.nutritional_tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{item.nutritional_tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{item.lead_minutes} Min.</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                {MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type}
              </span>
            </div>
          </div>
          {hasDetails && (
            <div className="shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          )}
        </button>

        {expanded && <RecipeCardExpanded item={item} />}
      </div>
    </div>
  );
}

function DayTimeline({ day }: { day: CookingScheduleDay }) {
  const hasAllergens = day.day_nutritional_tags && day.day_nutritional_tags.length > 0;
  const hasCost = day.total_cost_eur > 0;

  const groupedItems: Record<string, CookingScheduleItem[]> = {};
  for (const item of day.items) {
    if (!groupedItems[item.meal_type]) {
      groupedItems[item.meal_type] = [];
    }
    groupedItems[item.meal_type].push(item);
  }

  return (
    <section className="mb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-2 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-display font-bold text-foreground">
            {formatDate(day.date)}
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {day.portions} Personen
            </span>
            {day.day_start_time && day.day_end_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {day.day_start_time} – {day.day_end_time} ({day.day_duration_minutes} Min.)
              </span>
            )}
            {hasCost && (
              <span className="font-medium">{day.total_cost_eur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            )}
          </div>
        </div>
        {hasAllergens && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {day.day_nutritional_tags.map((tag) => (
              <AllergenChip key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {MEAL_TYPE_ORDER.map((mealType) => {
          const items = groupedItems[mealType];
          if (!items || items.length === 0) return null;
          return (
            <div key={mealType} className="mb-4">
              <h3 className={`flex items-center gap-2 text-sm font-display font-bold mb-2 px-3 py-1.5 rounded-lg transition-colors group hover:bg-muted/30 ${MEAL_TYPE_COLORS[mealType]?.text ?? 'text-foreground'}`}>
                {(() => {
                  const IconComponent = MEAL_TYPE_ICONS_LUCIDE[mealType];
                  if (!IconComponent) return null;
                  return <IconComponent className="w-4 h-4 transition-transform group-hover:scale-105" aria-label={MEAL_TYPE_LABELS[mealType] ?? mealType} />;
                })()}
                {MEAL_TYPE_LABELS[mealType] ?? mealType}
              </h3>
              {items.map((item, idx) => (
                <TimelineItem
                  key={`${item.recipe_slug}-${idx}`}
                  item={item}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface CookingScheduleTabProps {
  mealPlanId: number;
}

export default function CookingScheduleTab({ mealPlanId }: CookingScheduleTabProps) {
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

  const totalCost = schedule.days.reduce((sum, day) => sum + day.total_cost_eur, 0);

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display font-bold text-foreground">Kochplan</h2>
            {plan && (
              <p className="text-xs text-muted-foreground">{plan.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
          {plan && (
            <>
              <span>👥 {plan.norm_portions.toFixed(1)} Personen</span>
              {totalCost > 0 && (
                <span>{totalCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
              )}
            </>
          )}
          <a
            href={`/meal-plans/${mealPlanId}/cooking-schedule/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold bg-card hover:bg-muted/50 transition-all shadow-soft"
          >
            🖨️ Drucken
          </a>
        </div>
      </div>

      {/* Warning Banner */}
      {schedule.excluded_meal_count > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {schedule.excluded_meal_count}{' '}
            {schedule.excluded_meal_count === 1 ? 'Mahlzeit wurde' : 'Mahlzeiten wurden'} nicht berücksichtigt.
          </span>
        </div>
      )}

      {/* Empty State */}
      {schedule.days.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <ChefHat className="w-12 h-12 mx-auto opacity-30" />
          <p className="font-medium">Keine Rezepte im Kochplan</p>
          <p className="text-sm">
            Plane Mahlzeiten mit Servierzeit, damit der Kochplan berechnet werden kann.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6">
          {schedule.days.map((day) => (
            <DayTimeline key={day.date} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
