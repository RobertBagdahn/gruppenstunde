import { Link } from 'react-router-dom';
import { Link2, Plus } from 'lucide-react';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { RefMeal } from '@/schemas/mealPlan';
import { plural } from '@/lib/format';

/** Meal types that support a reference meal. */
export const REF_MEAL_TYPES = ['breakfast', 'snack'] as const;

interface RefMealChipsProps {
  mealPlanId: number;
  refMeals: RefMeal[];
  canEdit: boolean;
}

/**
 * Chips for the reference meals of a plan (from `ref_meals` of the plan detail).
 * Existing reference meals show item count and sync status; editors additionally
 * get chips to create missing reference meals.
 */
export function RefMealChips({ mealPlanId, refMeals, canEdit }: RefMealChipsProps) {
  const byType = new Map(refMeals.map((rm) => [rm.meal_type, rm]));
  const missingTypes = canEdit ? REF_MEAL_TYPES.filter((mt) => !byType.has(mt)) : [];

  if (refMeals.length === 0 && missingTypes.length === 0) return null;

  const chipClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-body transition-colors';

  return (
    <div className="flex flex-wrap gap-2 px-1" aria-label="Referenzmahlzeiten">
      {refMeals.map((rm) => {
        const label = MEAL_TYPE_LABELS[rm.meal_type] || rm.meal_type;
        const details = `${plural(rm.items.length, 'Eintrag', 'Einträge')} · ${rm.synced_meals_count}/${rm.total_meals_count} verknüpft`;
        const content = (
          <>
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Referenz: {label}</span>
            <span className="text-caption text-muted-foreground">{details}</span>
          </>
        );
        return canEdit ? (
          <Link
            key={rm.id}
            to={`/meal-plans/${mealPlanId}/ref-meals/${rm.meal_type}`}
            className={`${chipClass} hover:bg-accent`}
          >
            {content}
          </Link>
        ) : (
          <span key={rm.id} className={chipClass}>
            {content}
          </span>
        );
      })}
      {missingTypes.map((mt) => (
        <Link
          key={mt}
          to={`/meal-plans/${mealPlanId}/ref-meals/${mt}`}
          className={`${chipClass} border-dashed text-muted-foreground hover:bg-accent`}
        >
          <Plus className="w-3.5 h-3.5" />
          Referenz: {MEAL_TYPE_LABELS[mt] || mt}
        </Link>
      ))}
    </div>
  );
}
