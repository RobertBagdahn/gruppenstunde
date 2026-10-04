import { Link } from 'react-router-dom';
import type { RecipeUsage } from '@/schemas/recipe';

interface RecipeDeleteUsageNoticeProps {
  usage: RecipeUsage | undefined;
}

/** Shown in the recipe delete dialog when the recipe is still used in meal plans. */
export default function RecipeDeleteUsageNotice({ usage }: RecipeDeleteUsageNoticeProps) {
  if (!usage || usage.plan_count <= 0) return null;

  const hiddenCount = usage.plan_count - usage.plans.length;
  const noun = usage.plan_count === 1 ? 'Essensplan' : 'Essensplänen';

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-body"
      data-testid="recipe-delete-usage"
    >
      <p className="font-medium text-foreground">
        Wird in {usage.plan_count} {noun} verwendet
      </p>
      <p className="mt-1 text-muted-foreground">
        Entferne das Rezept zuerst dort, danach kannst du es löschen.
      </p>
      {usage.plans.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {usage.plans.map((plan) => (
            <li key={plan.id}>
              <Link to={`/meal-plans/${plan.id}`} className="text-primary underline-offset-2 hover:underline">
                {plan.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hiddenCount > 0 && (
        <p className="mt-2 text-muted-foreground">
          {usage.plans.length > 0 ? `und ${hiddenCount} weitere` : `${hiddenCount}`} Pläne anderer Nutzer
        </p>
      )}
    </div>
  );
}
