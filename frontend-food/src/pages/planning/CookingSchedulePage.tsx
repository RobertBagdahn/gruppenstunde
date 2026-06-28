import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMealPlan, useCookingSchedule } from '@/api/mealPlans';
import { BackButton } from '@/components/shared/BackButton';
import { Loader2, Printer, Info, ChefHat, Clock, ChevronDown, ChevronRight, UtensilsCrossed, ListChecks, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { CookingScheduleItem, CookingScheduleIngredient } from '@/schemas/mealPlan';
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

const MEAL_TYPE_BADGES: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
  lunch: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  dinner: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  snack: 'bg-rose-100 text-rose-800 border-rose-200',
  drink: 'bg-sky-100 text-sky-800 border-sky-200',
};

function IngredientBadge({ ing }: { ing: CookingScheduleIngredient }) {
  const parts = [ing.quantity, ing.unit, ing.name].filter(Boolean);
  const detail = ing.note ? ` (${ing.note})` : '';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border
      ${ing.is_optional ? 'bg-muted text-muted-foreground border-border italic' : 'bg-primary/5 text-foreground border-primary/10'}`}
    >
      {parts.join(' ')}{detail}
      {ing.is_optional && <span className="text-[10px]">(optional)</span>}
    </span>
  );
}

function AllergenBadge({ name, isDangerous }: { name: string; isDangerous?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
        isDangerous ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {isDangerous && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
      {name}
    </span>
  );
}

function RecipeDetail({ item }: { item: CookingScheduleItem }) {
  const hasIngredients = item.ingredients.length > 0;
  const hasSteps = item.steps_parsed.length > 0 || item.steps.trim().length > 0;
  const hasAllergens = item.nutritional_tags.length > 0;

  if (!hasIngredients && !hasSteps && !hasAllergens) return null;

  return (
    <div className="px-4 pb-4 pt-1 bg-muted/20 space-y-2">
      {hasAllergens && (
        <div className="flex flex-wrap gap-1">
          {item.nutritional_tags.map((tag) => (
            <AllergenBadge key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {hasIngredients && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Zutaten ({item.portions} Port.)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.ingredients.map((ing, i) => (
                <IngredientBadge key={`${ing.name}-${i}`} ing={ing} />
              ))}
            </div>
          </div>
        )}

        {hasSteps && (
          <div className={hasIngredients ? '' : 'md:col-span-2'}>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <ListChecks className="w-3.5 h-3.5" />
              Zubereitung
            </h4>
            {item.steps_parsed.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                {item.steps_parsed.map((step, i) => (
                  <li key={i} className="pl-1">
                    <span className="whitespace-pre-line">{step.text.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')}</span>
                    {step.timer && <span className="text-xs text-primary ml-1">(⏱ {step.timer} Min.)</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {item.steps}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CookingSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id);
  const { data: plan, isLoading: planLoading } = useMealPlan(mealPlanId);
  const { data: schedule, isLoading: scheduleLoading, error } = useCookingSchedule(mealPlanId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isLoading = planLoading || scheduleLoading;

  function toggleExpand(key: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground">{plan.name}</p>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  👥 {schedule.norm_portions ?? plan.norm_portions} Personen
                </span>
                {schedule.total_cost_eur > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {schedule.total_cost_eur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/meal-plans/${id}/cooking-schedule/kitchen`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-bold bg-card hover:bg-muted/50 transition-all shadow-soft"
            title="Küchen-Dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <a
            href={`/meal-plans/${id}/cooking-schedule/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-bold bg-card hover:bg-muted/50 transition-all shadow-soft"
            title="Druckansicht öffnen"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Drucken</span>
          </a>
        </div>
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
      {schedule.days.map((day) => {
        const hasAllergens = day.day_nutritional_tags && day.day_nutritional_tags.length > 0;
        return (
          <section key={day.date} className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-base font-display font-bold text-foreground">
                {formatDate(day.date)}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {day.day_start_time && day.day_end_time && (
                  <span>⏱ {day.day_start_time} – {day.day_end_time}</span>
                )}
                {day.total_cost_eur > 0 && (
                  <span className="font-medium">{day.total_cost_eur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                )}
              </div>
            </div>

            {hasAllergens && (
              <div className="flex flex-wrap gap-1.5">
                {day.day_nutritional_tags.map((tag) => (
                  <AllergenBadge key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
                ))}
              </div>
            )}

            {/* Tabelle */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[2rem_5rem_5rem_1fr_5rem_8rem_4.5rem] gap-3 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span />
                <span>Start</span>
                <span>Servierzeit</span>
                <span>Rezept</span>
                <span className="text-right">Dauer</span>
                <span>Mahlzeit</span>
                <span className="text-right">Portionen</span>
              </div>

              {/* Zeilen */}
              <div className="divide-y divide-border">
                {day.items.map((item, idx) => {
                  const key = `${day.date}-${item.recipe_slug}-${idx}`;
                  const isExpanded = expandedItems.has(key);
                  const hasDetails = item.ingredients.length > 0 || item.steps_parsed.length > 0 || item.steps.trim().length > 0;

                  return (
                    <div key={key}>
                      <div
                        className={`grid grid-cols-1 md:grid-cols-[2rem_5rem_5rem_1fr_5rem_8rem_4.5rem] gap-2 md:gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/20' : ''}`}
                        onClick={() => hasDetails && toggleExpand(key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hasDetails && toggleExpand(key); }}}
                      >
                        {/* Expand-Icon */}
                        <div className="hidden md:flex justify-center">
                          {hasDetails ? (
                            isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <span className="w-4 h-4" />
                          )}
                        </div>

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
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.recipe_title}
                          </Link>
                          {item.nutritional_tags && item.nutritional_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.nutritional_tags.slice(0, 2).map((tag) => (
                                <AllergenBadge key={tag.name} name={tag.name} isDangerous={tag.is_dangerous} />
                              ))}
                              {item.nutritional_tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{item.nutritional_tags.length - 2}</span>
                              )}
                            </div>
                          )}
                          {hasDetails && (
                            <span className="md:hidden text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                              {isExpanded ? 'Details ausblenden' : 'Zutaten & Schritte'}
                            </span>
                          )}
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
                              MEAL_TYPE_BADGES[item.meal_type] ?? 'bg-muted text-muted-foreground border-border'
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

                      {/* Expandierter Detail-Bereich */}
                      {isExpanded && <RecipeDetail item={item} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
