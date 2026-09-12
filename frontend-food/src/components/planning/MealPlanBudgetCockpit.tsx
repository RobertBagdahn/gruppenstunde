import { useMemo } from 'react';
import { Wallet, Flame, Users, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Meal } from '@/schemas/mealPlan';
import { NORM_PERSON_DAILY_KCAL, effectivePortions } from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';

interface MealPlanBudgetCockpitProps {
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  reserveFactor?: number;
  meals: Meal[];
  onNavigateToCosts?: () => void;
  onNavigateToSuggestions?: () => void;
}

export function MealPlanBudgetCockpit({
  normPortions,
  budgetPerPersonPerDay,
  reserveFactor = 1,
  meals,
  onNavigateToCosts,
  onNavigateToSuggestions,
}: MealPlanBudgetCockpitProps) {
  const metrics = useMemo(() => {
    // Unique days
    const dateSet = new Set<string>();
    for (const meal of meals) {
      if (meal.start_datetime) {
        dateSet.add(meal.start_datetime.slice(0, 10));
      }
    }
    const numDays = Math.max(1, dateSet.size);

    let totalCostSum = 0;
    let totalKcalSum = 0;

    for (const meal of meals) {
      const eff = effectivePortions(meal, normPortions);
      if (eff > 0) {
        // Exclude drinks from kcal per standard nutrition specs
        if (meal.meal_type !== 'drinks') {
          totalKcalSum += meal.total_energy_kcal / eff;
        }
        totalCostSum += meal.total_cost_eur / eff;
      }
    }

    const actualCostPerPersonPerDay = totalCostSum / numDays;
    const actualKcalPerPersonPerDay = Math.round(totalKcalSum / numDays);

    const budget = budgetPerPersonPerDay ? Number(budgetPerPersonPerDay) : null;
    const hasBudget = budget !== null && budget > 0;

    let budgetStatus: 'green' | 'yellow' | 'red' = 'green';
    let budgetPercent = 0;
    let diffPerPersonPerDay = 0;

    if (hasBudget) {
      budgetPercent = Math.min(200, Math.round((actualCostPerPersonPerDay / budget) * 100));
      diffPerPersonPerDay = budget - actualCostPerPersonPerDay;
      if (actualCostPerPersonPerDay <= budget) {
        budgetStatus = 'green';
      } else if (actualCostPerPersonPerDay <= budget * 1.2) {
        budgetStatus = 'yellow';
      } else {
        budgetStatus = 'red';
      }
    }

    const kcalPercent = Math.min(150, Math.round((actualKcalPerPersonPerDay / NORM_PERSON_DAILY_KCAL) * 100));

    return {
      numDays,
      hasBudget,
      budget,
      actualCostPerPersonPerDay,
      diffPerPersonPerDay,
      budgetPercent,
      budgetStatus,
      actualKcalPerPersonPerDay,
      kcalPercent,
      totalCostAllParticipants: totalCostSum * normPortions,
    };
  }, [meals, normPortions, budgetPerPersonPerDay]);

  const {
    hasBudget,
    budget,
    actualCostPerPersonPerDay,
    diffPerPersonPerDay,
    budgetPercent,
    budgetStatus,
    actualKcalPerPersonPerDay,
    kcalPercent,
  } = metrics;

  return (
    <div className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-4 shadow-soft transition-all">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-center">
        {/* Budget KPI */}
        <div
          onClick={onNavigateToCosts}
          className={cn(
            "flex flex-col gap-1.5 p-2.5 rounded-lg border transition-colors",
            onNavigateToCosts && "cursor-pointer hover:border-primary/40 hover:bg-muted/40",
            hasBudget && budgetStatus === 'green' && "bg-primary/5 border-primary/20",
            hasBudget && budgetStatus === 'yellow' && "bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/30",
            hasBudget && budgetStatus === 'red' && "bg-destructive/10 border-destructive/30",
            !hasBudget && "bg-muted/30 border-border/50"
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              Tagesbudget / Person
            </span>
            {hasBudget ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
                  budgetStatus === 'green' && "bg-primary/15 text-primary",
                  budgetStatus === 'yellow' && "bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))]",
                  budgetStatus === 'red' && "bg-destructive/20 text-destructive"
                )}
              >
                {budgetStatus === 'green' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Im Budget
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    {budgetStatus === 'yellow' ? 'Knapp' : 'Überzogen'}
                  </>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Kein Budgetlimit</span>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="text-base sm:text-lg font-bold text-foreground font-display">
              {actualCostPerPersonPerDay.toFixed(2).replace('.', ',')} €
              {hasBudget && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {budget?.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </div>
            {hasBudget && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  diffPerPersonPerDay >= 0 ? "text-primary" : "text-destructive"
                )}
              >
                {diffPerPersonPerDay >= 0 ? '+' : ''}
                {diffPerPersonPerDay.toFixed(2).replace('.', ',')} € Rest
              </span>
            )}
          </div>

          {hasBudget && (
            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  budgetStatus === 'green' && "bg-primary",
                  budgetStatus === 'yellow' && "bg-[hsl(var(--chart-4))]",
                  budgetStatus === 'red' && "bg-destructive"
                )}
                style={{ width: `${Math.min(100, budgetPercent)}%` }}
              />
            </div>
          )}
        </div>

        {/* Calories KPI */}
        <div
          onClick={onNavigateToSuggestions}
          className={cn(
            "flex flex-col gap-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/30 transition-colors",
            onNavigateToSuggestions && "cursor-pointer hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Kalorienschnitt / Tag
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              {kcalPercent}%
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="text-base sm:text-lg font-bold text-foreground font-display">
              {actualKcalPerPersonPerDay}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {NORM_PERSON_DAILY_KCAL} kcal
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              Ziel: 2.000 <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                kcalPercent >= 85 && kcalPercent <= 115 ? "bg-primary" : "bg-orange-500"
              )}
              style={{ width: `${Math.min(100, kcalPercent)}%` }}
            />
          </div>
        </div>

        {/* Meta / Plan Info */}
        <div className="flex items-center justify-between sm:justify-start lg:justify-between gap-4 p-2.5 rounded-lg border border-border/50 bg-muted/30 col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-background border border-border/60 text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {normPortions.toFixed(1)} Personen
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                +{Math.round((reserveFactor - 1) * 100)}% Einkaufsreserve
              </div>
            </div>
          </div>

          {onNavigateToCosts && (
            <button
              onClick={onNavigateToCosts}
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              Kosten-Details →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
