import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, AlertCircle, Info, Utensils, Lightbulb } from 'lucide-react';
import { useMealPlanCosts, useIngredientScan } from '@/api/mealPlans';
import { MEAL_TYPE_LABELS, getDayCoverage, getEffectiveCoverage, getCoverageBadge } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import SollIstBar from '@/components/shared/SollIstBar';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';

interface CostDashboardProps {
  mealPlanId: number;
  budgetPerPersonPerDay?: number | null;
  meals?: Meal[];
  onSelectTab?: (tab: 'plan' | 'schedule' | 'table' | 'costs' | 'shopping' | 'suggestions' | 'ingredient-scan') => void;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function CostDashboard({ mealPlanId, budgetPerPersonPerDay, meals, onSelectTab }: CostDashboardProps) {
  const { data, isLoading, error } = useMealPlanCosts(mealPlanId);
  const { data: scanData } = useIngredientScan(mealPlanId);
  const [showPerPortion, setShowPerPortion] = useState(true);

  // Compute day coverage from meals if available
  const dayCoverageMap = useMemo(() => {
    if (!meals) return {};
    const groups: Record<string, Meal[]> = {};
    for (const meal of meals) {
      if (!meal.start_datetime) continue;
      const date = meal.start_datetime.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(meal);
    }
    const map: Record<string, number> = {};
    for (const [date, dayMeals] of Object.entries(groups)) {
      map[date] = getDayCoverage(dayMeals);
    }
    return map;
  }, [meals]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive font-sans">
        Fehler beim Laden der Kostendaten.
      </div>
    );
  }

  if (!data) return null;

  const coverage = data.total_ingredients > 0
    ? Math.round((data.priced_ingredients / data.total_ingredients) * 100)
    : 0;
  const isIncomplete = data.priced_ingredients < data.total_ingredients;
  const numDays = data.days.length || 1;
  const costPerPersonPerDay = data.cost_per_person / numDays;

  // Average coverage across all days
  const avgDayCoverage = meals && meals.length > 0
    ? (() => {
        const groups: Record<string, Meal[]> = {};
        for (const meal of meals) {
          if (!meal.start_datetime) continue;
          const date = meal.start_datetime.slice(0, 10);
          if (!groups[date]) groups[date] = [];
          groups[date].push(meal);
        }
        const dates = Object.keys(groups);
        if (dates.length === 0) return 1;
        const totalCov = dates.reduce((sum, d) => sum + getDayCoverage(groups[d]), 0);
        return totalCov / dates.length;
      })()
    : 1;
  const effAvgCoverage = getEffectiveCoverage(avgDayCoverage);

  const budget = budgetPerPersonPerDay ? Number(budgetPerPersonPerDay) : null;
  const hasBudget = budget !== null && budget > 0;

  const scaledBudget = hasBudget ? budget * effAvgCoverage : null;

  const budgetStatus = hasBudget
    ? costPerPersonPerDay <= scaledBudget!
      ? 'green'
      : costPerPersonPerDay <= scaledBudget! * 1.2
        ? 'yellow'
        : 'red'
    : 'green';

  return (
    <div className="space-y-6 font-sans">
      {scanData && scanData.violations.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm flex items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⚠️</span>
            <p className="font-semibold text-destructive truncate">
              Ernährungseinschränkungen erkannt: {Array.from(new Set(scanData.violations.map(v => v.nutritional_tag.name))).join(', ')}. {scanData.summary.affected_meals} {scanData.summary.affected_meals === 1 ? 'Mahlzeit' : 'Mahlzeiten'} betroffen.
            </p>
          </div>
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('ingredient-scan')}
              className="text-xs font-bold underline shrink-0 text-destructive hover:text-destructive/80 transition-colors"
            >
              Zum Scanner
            </button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowPerPortion(!showPerPortion)}
          className="text-xs px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all font-semibold shadow-soft"
        >
          {showPerPortion ? 'Gesamt anzeigen' : `Pro Portion (${data.norm_portions})`}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Gesamtkosten (ohne Reserve)" value={formatEur(data.total_cost)} />
        <SummaryCard
          label={`Gesamtkosten (inkl. Reserve +${Math.round((data.reserve_factor - 1) * 100)}%)`}
          value={formatEur(data.total_cost_with_reserve)}
        />
        <SummaryCard label="Pro Person" value={formatEur(data.cost_per_person)} />
        <SummaryCard label="Pro Pers./Tag" value={formatEur(costPerPersonPerDay)} />
        <SummaryCard label="Normpersonen" value={String(data.norm_portions)} />
      </div>

      {/* Budget relative progress bar */}
      {hasBudget && (
        <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-soft">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3 font-display text-foreground">
            <Wallet className="w-4 h-4 text-primary" />
            Budget-Auslastung (pro Person/Tag)
          </h3>
          <div className="max-w-xl">
            {avgDayCoverage < 1 && (
              <div className="text-[10px] text-muted-foreground italic mb-2">
                Skaliert auf {Math.round(effAvgCoverage * 100)} % Tagesabdeckung (Ø {Math.round(avgDayCoverage * 100)} %)
              </div>
            )}
            <SollIstBar
              current={costPerPersonPerDay}
              min_green={null}
              max_green={scaledBudget}
              target_mid={scaledBudget}
              status={budgetStatus}
              unit="€"
            />
          </div>
        </div>
      )}

      {/* Incomplete data warning */}
      {isIncomplete && (
        <div className={`flex items-start gap-3 p-4 border rounded-xl text-sm shadow-soft ${
          coverage < 50
            ? 'bg-destructive/10 border-destructive/20 text-destructive'
            : 'bg-accent/10 border-accent/20 text-accent-foreground'
        }`}>
          {coverage < 50 ? (
            <AlertCircle className="w-4.5 h-4.5 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4.5 h-4.5 text-accent shrink-0 mt-0.5" />
          )}
          <span className="font-medium">
            Geschätzte Kosten — {data.priced_ingredients} von {data.total_ingredients} Zutaten haben einen Preis ({coverage}% Abdeckung).
          </span>
        </div>
      )}

      {/* Recipe costs */}
      {data.recipes.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 font-display text-foreground">
            <Utensils className="w-5 h-5 text-primary" />
            Rezeptkosten {showPerPortion ? '(pro Portion)' : '(gesamt)'}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recipes.map((recipe) => {
              const hasNoPrice = recipe.priced_ingredients === 0;
              const isPartial = recipe.priced_ingredients > 0 && recipe.priced_ingredients < recipe.total_ingredients;
              return (
                <Link
                  key={recipe.recipe_id}
                  to={`/recipes/${recipe.recipe_slug}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all shadow-soft"
                >
                  <span className="text-sm font-semibold truncate text-foreground">{recipe.recipe_title}</span>
                  {hasNoPrice ? (
                    <span className="text-xs font-semibold text-muted-foreground ml-2">Keine Preise</span>
                  ) : isPartial ? (
                    <span className="text-sm font-semibold tabular-nums text-accent ml-2" title={`${recipe.priced_ingredients}/${recipe.total_ingredients} Zutaten mit Preis`}>
                      ~{formatEur(showPerPortion ? recipe.cost_per_person : recipe.total_cost)}
                    </span>
                  ) : (
                    <span className="text-sm font-bold tabular-nums text-primary ml-2">
                      {formatEur(showPerPortion ? recipe.cost_per_person : recipe.total_cost)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily breakdown list */}
      {data.days.length > 0 && (
        <div className="space-y-3.5">
          <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            Tagesübersicht
          </h3>
          <CardTable>
            {data.days.map((day) => {
              const d = new Date(day.date + 'T00:00:00');
              const weekday = d.toLocaleDateString('de-DE', { weekday: 'long' });
              const dateLabel = d.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              const dayCoverage = dayCoverageMap[day.date] ?? 1;
              const badge = getCoverageBadge(dayCoverage);
              const badgeColors = {
                green: 'bg-primary/10 text-primary border-primary/20',
                yellow: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20',
                red: 'bg-destructive/10 text-destructive border-destructive/20',
                overplanned: 'bg-destructive/10 text-destructive border-destructive/20',
              };
              return (
                <DataCardRow key={day.date} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5">
                  {/* Tag Info */}
                  <div className="flex flex-col min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base text-foreground">
                        {weekday}
                      </span>
                      {dayCoverage !== 1 && (
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded border ${badgeColors[badge.status]}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {dateLabel}
                    </span>
                  </div>

                  {/* Meals */}
                  <div className="flex flex-wrap gap-2 flex-grow md:justify-start">
                    {day.meals.map((meal) => (
                      <span
                        key={meal.meal_id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 border border-border/40 rounded-lg text-xs font-medium"
                      >
                        <span className="text-foreground font-semibold">{MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}</span>
                        <span className="text-muted-foreground">
                          {meal.cost > 0
                            ? formatEur(showPerPortion ? meal.cost_per_person : meal.cost)
                            : '–'}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Costs */}
                  <div className="flex items-center gap-6 border-t border-border/40 pt-3 md:pt-0 md:border-0 justify-between md:justify-end w-full md:w-auto shrink-0">
                    <div className="text-right">
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Gesamt</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {day.total_cost > 0 ? formatEur(day.total_cost) : '–'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pro Person</span>
                      <span className="text-sm font-bold tabular-nums text-primary">
                        {day.cost_per_person > 0 ? formatEur(day.cost_per_person) : '–'}
                      </span>
                    </div>
                  </div>
                </DataCardRow>
              );
            })}
          </CardTable>
        </div>
      )}

      {/* Hinweis-Banner */}
      <div className="rounded-xl border border-accent/20 bg-accent/10 p-4 flex items-start gap-3 shadow-soft">
        <Lightbulb className="text-accent w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-accent font-display text-sm">Preise verwalten</p>
          <p className="text-xs font-semibold text-accent-foreground/80 mt-0.5 leading-relaxed">
            Zutatenpreise kannst du in der{' '}
            <Link to="/ingredients" className="font-bold underline hover:no-underline text-accent">
              Zutatendatenbank
            </Link>{' '}
            hinterlegen.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-soft transition-all hover:shadow-md">
      <div className="text-xs font-semibold text-muted-foreground mb-1.5 leading-snug">{label}</div>
      <div className="text-lg font-bold font-display text-foreground tabular-nums">{value}</div>
    </div>
  );
}
