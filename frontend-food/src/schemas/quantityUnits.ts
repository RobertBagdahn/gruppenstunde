/**
 * Zod schemas for ingredient quantity units.
 * MUST stay in sync with backend/supply/schemas/ingredients.py (UnitOptionOut,
 * IngredientUnitOptionsOut) and backend/planner/schemas/meal_plan.py (MealItemCreateIn/UpdateIn).
 */
import { z } from 'zod';

export const UnitKindSchema = z.enum(['grams', 'milliliters', 'portion', 'standard']);
export type UnitKind = z.infer<typeof UnitKindSchema>;

export const UnitOptionSchema = z.object({
  key: z.string(),
  kind: UnitKindSchema,
  label: z.string(),
  grams_per_unit: z.number().nullable(),
  is_approx: z.boolean(),
  has_weight: z.boolean(),
  portion_id: z.number().nullable(),
  measuring_unit_id: z.number().nullable(),
  standard_measure_key: z.string().nullable(),
});
export type UnitOption = z.infer<typeof UnitOptionSchema>;

export const IngredientUnitOptionsSchema = z.object({
  ingredient_id: z.number(),
  options: z.array(UnitOptionSchema),
});
export type IngredientUnitOptions = z.infer<typeof IngredientUnitOptionsSchema>;
