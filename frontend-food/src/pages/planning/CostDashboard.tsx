import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, AlertCircle, Info, Utensils, Lightbulb } from 'lucide-react';
import { useMealPlanCosts } from '@/api/mealPlans';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import SollIstBar from '@/components/shared/SollIstBar';

interface CostDashboardProps {
  mealPlanId: number;
  budgetPerPersonPerDay?: number | null;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function CostDashboard({ mealPlanId, budgetPerPersonPerDay }: CostDashboardProps) {
  const { data, isLoading, error } = useMealPlanCosts(mealPlanId);
  const [showPerPortion, setShowPerPortion] = useState(true);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
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

  const budget = budgetPerPersonPerDay ? Number(budgetPerPersonPerDay) : null;
  const hasBudget = budget !== null && budget > 0;

  const budgetStatus = hasBudget
    ? costPerPersonPerDay <= budget
      ? 'green'
      : costPerPersonPerDay <= budget * 1.2
        ? 'yellow'
        : 'red'
    : 'green';

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowPerPortion(!showPerPortion)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/50 transition-colors font-medium"
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
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 font-display">
            <Wallet className="w-4 h-4 text-primary" />
            Budget-Auslastung (pro Person/Tag)
          </h3>
          <div className="max-w-xl">
            <SollIstBar
              current={costPerPersonPerDay}
              min_green={null}
              max_green={budget}
              target_mid={budget}
              status={budgetStatus}
              unit="€"
            />
          </div>
        </div>
      )}

      {/* Incomplete data warning */}
      {isIncomplete && (
        <div className={`flex items-start gap-2 p-3 border rounded-lg text-sm ${
          coverage < 50
            ? 'bg-destructive/10 border-destructive/20 text-destructive'
            : 'bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))]'
        }`}>
          {coverage < 50 ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-[hsl(var(--chart-4))] shrink-0 mt-0.5" />
          )}
          <span>
            Geschätzte Kosten — {data.priced_ingredients} von {data.total_ingredients} Zutaten haben einen Preis ({coverage}% Abdeckung).
          </span>
        </div>
      )}

      {/* Recipe costs */}
      {data.recipes.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/30 p-5">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 font-display">
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
                  className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-white hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{recipe.recipe_title}</span>
                  {hasNoPrice ? (
                    <span className="text-xs text-muted-foreground ml-2">Keine Preise</span>
                  ) : isPartial ? (
                    <span className="text-sm tabular-nums text-[hsl(var(--chart-4))] ml-2" title={`${recipe.priced_ingredients}/${recipe.total_ingredients} Zutaten mit Preis`}>
                      ~{formatEur(showPerPortion ? recipe.cost_per_person : recipe.total_cost)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-primary ml-2">
                      {formatEur(showPerPortion ? recipe.cost_per_person : recipe.total_cost)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily breakdown table */}
      {data.days.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tag</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gesamt</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Pro Person</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Mahlzeiten</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((day) => {
                const d = new Date(day.date);
                const dateLabel = d.toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                });
                return (
                  <tr key={day.date} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">{dateLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{day.total_cost > 0 ? formatEur(day.total_cost) : '–'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{day.cost_per_person > 0 ? formatEur(day.cost_per_person) : '–'}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {day.meals.map((meal) => (
                          <span
                            key={meal.meal_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            <span>{MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}</span>
                            <span className="text-muted-foreground">
                              {meal.cost > 0
                                ? formatEur(showPerPortion ? meal.cost_per_person : meal.cost)
                                : '–'}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-medium">
                <td className="px-3 py-2">Gesamt</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatEur(data.total_cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatEur(data.cost_per_person)}</td>
                <td className="px-3 py-2 hidden sm:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Hinweis-Banner */}
      <div className="rounded-2xl border border-[hsl(var(--chart-4))]/20 bg-[hsl(var(--chart-4))]/10 p-4 flex items-start gap-3">
        <Lightbulb className="text-[hsl(var(--chart-4))] w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[hsl(var(--chart-4))] font-display">Preise verwalten</p>
          <p className="text-sm text-[hsl(var(--chart-4))]/80">
            Zutatenpreise kannst du in der{' '}
            <Link to="/ingredients" className="font-semibold underline hover:no-underline text-[hsl(var(--chart-4))]">
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
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
