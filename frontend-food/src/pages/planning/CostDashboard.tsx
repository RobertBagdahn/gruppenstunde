import { Link } from 'react-router-dom';
import { useMealPlanCosts } from '@/api/mealPlans';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';

interface CostDashboardProps {
  mealPlanId: number;
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function CostDashboard({ mealPlanId }: CostDashboardProps) {
  const { data, isLoading, error } = useMealPlanCosts(mealPlanId);

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Gesamtkosten" value={formatEur(data.total_cost)} />
        <SummaryCard label="Pro Person" value={formatEur(data.cost_per_person)} />
        <SummaryCard label="Pro Pers./Tag" value={formatEur(costPerPersonPerDay)} />
        <SummaryCard label="Normpersonen" value={String(data.norm_portions)} />
        <SummaryCard label="Tage" value={String(data.days.length)} />
      </div>

      {/* Incomplete data warning */}
      {isIncomplete && (
        <div className={`flex items-start gap-2 p-3 border rounded-lg text-sm ${
          coverage < 50
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <span className={`material-symbols-outlined text-[18px] mt-0.5 ${coverage < 50 ? 'text-red-600' : 'text-amber-600'}`}>
            {coverage < 50 ? 'error' : 'info'}
          </span>
          <span className={coverage < 50 ? 'text-red-800' : 'text-amber-800'}>
            Geschätzte Kosten — {data.priced_ingredients} von {data.total_ingredients} Zutaten haben einen Preis ({coverage}% Abdeckung).
          </span>
        </div>
      )}

      {/* Recipe costs */}
      {data.recipes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-amber-50/30 p-5">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]">restaurant</span>
            Rezeptkosten
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recipes.map((recipe) => (
              <Link
                key={recipe.recipe_id}
                to={`/recipes/${recipe.recipe_slug}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-white hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium truncate">{recipe.recipe_title}</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-700 ml-2">
                  {recipe.total_cost > 0 ? formatEur(recipe.total_cost) : '–'}
                </span>
              </Link>
            ))}
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
                    <td className="px-3 py-2 text-right tabular-nums">{formatEur(day.total_cost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatEur(day.cost_per_person)}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {day.meals.map((meal) => (
                          <span
                            key={meal.meal_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            <span>{MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}</span>
                            <span className="text-muted-foreground">{formatEur(meal.cost)}</span>
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
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">lightbulb</span>
        <div>
          <p className="font-semibold text-amber-800">Preise verwalten</p>
          <p className="text-sm text-amber-700">
            Zutatenpreise kannst du in der{' '}
            <Link to="/ingredients" className="font-semibold underline hover:no-underline">
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
