import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRecipeUsage } from '@/api/recipes';

interface RecipeUsageInMealPlansProps {
  recipeId: number;
  count: number;
}

export default function RecipeUsageInMealPlans({ recipeId, count }: RecipeUsageInMealPlansProps) {
  const { data: usage } = useRecipeUsage(recipeId, { enabled: count > 0 });

  if (count <= 0) return null;

  const plans = usage?.plans ?? [];
  const hiddenCount = usage ? usage.plan_count - plans.length : 0;

  return (
    <div className="mt-6 bg-card rounded-xl border p-4 flex items-start gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
        <CalendarDays className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-body text-muted-foreground leading-9">
          In{' '}
          <span className="font-semibold text-foreground">
            {count} {count === 1 ? 'Essensplan' : 'Essensplänen'}
          </span>{' '}
          verwendet
        </p>
        {plans.length > 0 && (
          <ul className="flex flex-wrap gap-2 pb-1" data-testid="recipe-usage-plans">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  to={`/meal-plans/${plan.id}`}
                  className="inline-block rounded-full border px-3 py-1 text-body text-primary hover:bg-primary/10"
                >
                  {plan.name}
                </Link>
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className="px-1 py-1 text-body text-muted-foreground">
                und {hiddenCount} {hiddenCount === 1 ? 'weiterer' : 'weitere'} von anderen Nutzern
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
