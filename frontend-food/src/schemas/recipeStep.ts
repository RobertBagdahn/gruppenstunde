import { z } from 'zod';

/**
 * Zod schemas for recipe steps (1:1 sync with backend Pydantic schemas)
 * Keep these synchronized with: backend/recipe/schemas/steps.py
 */

// Recipe step ingredient schema
export const RecipeStepIngredientSchema = z.object({
  id: z.number(),
  recipe_item_id: z.number(),
  quantity_modifier: z.number().default(1.0),
  preparation: z.string().default(''),
  sort_order: z.number().default(0),
  // Resolved fields (read-only, provided by backend)
  ingredient_name: z.string().nullable().optional(),
  ingredient_id: z.number().nullable().optional(),
  unit_short: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type RecipeStepIngredient = z.infer<typeof RecipeStepIngredientSchema>;

// Input schema for creating/updating step ingredients
export const RecipeStepIngredientInputSchema = z.object({
  recipe_item_id: z.number(),
  quantity_modifier: z.number().default(1.0),
  preparation: z.string().default(''),
  sort_order: z.number().default(0),
});

export type RecipeStepIngredientInput = z.infer<typeof RecipeStepIngredientInputSchema>;

// Recipe step schema
export const RecipeStepSchema = z.object({
  id: z.number(),
  sort_order: z.number(),
  instruction: z.string(),
  duration_minutes: z.number().nullable().optional(),
  section: z.string().default(''),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  step_ingredients: z.array(RecipeStepIngredientSchema).default([]),
});

export type RecipeStep = z.infer<typeof RecipeStepSchema>;

// Input schema for creating/updating steps
export const RecipeStepInputSchema = z.object({
  sort_order: z.number(),
  instruction: z.string().min(1, 'Anleitung darf nicht leer sein'),
  duration_minutes: z.number().nullable().default(null),
  section: z.string().default(''),
  step_ingredients: z.array(RecipeStepIngredientInputSchema).default([]),
});

export type RecipeStepInput = z.infer<typeof RecipeStepInputSchema>;

// Batch update schema
export const RecipeStepsBatchInputSchema = z.object({
  recipe_slug: z.string(),
  steps: z.array(RecipeStepInputSchema),
});

export type RecipeStepsBatchInput = z.infer<typeof RecipeStepsBatchInputSchema>;

// List output schema
export const RecipeStepsListSchema = z.object({
  recipe_id: z.number(),
  recipe_slug: z.string(),
  has_structured_steps: z.boolean(),
  steps: z.array(RecipeStepSchema).default([]),
  count: z.number().default(0),
});

export type RecipeStepsList = z.infer<typeof RecipeStepsListSchema>;
