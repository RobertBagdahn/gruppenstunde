import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import type { QuantityWarning } from '@/schemas/buffet';

interface QuantityWarningsBannerProps {
  warnings: QuantityWarning[];
  /** Meal plan id used to build a link to the affected meal. */
  mealPlanId?: number;
}

/** Hint box shown above a shopping list generated from a meal plan when quantities look implausible. */
export function QuantityWarningsBanner({ warnings, mealPlanId }: QuantityWarningsBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 space-y-1.5"
      data-testid="quantity-warnings-banner"
    >
      <p className="flex items-center gap-1.5 text-body font-semibold text-destructive">
        <TriangleAlert className="w-4 h-4 shrink-0" />
        {warnings.length} {warnings.length === 1 ? 'Menge wirkt unplausibel' : 'Mengen wirken unplausibel'}
      </p>
      <ul className="space-y-1 pl-1">
        {warnings.map((warning, index) => (
          <li key={index} className="text-caption text-destructive/90 flex items-center gap-1.5">
            <span>{warning.message}</span>
            {mealPlanId != null && warning.meal_id != null && (
              <Link
                to={`/meal-plans/${mealPlanId}/plan#meal-${warning.meal_id}`}
                className="underline underline-offset-2 shrink-0"
              >
                Zur Mahlzeit
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
