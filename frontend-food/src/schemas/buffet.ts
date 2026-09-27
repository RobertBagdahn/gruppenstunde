/**
 * Zod schemas for the buffet builder.
 * MUST stay in sync with backend/planner/schemas/buffet.py and
 * backend/supply/schemas/buffet_catalog.py.
 */
import { z } from 'zod';

// ==========================================================================
// Quantity warnings
// ==========================================================================

export const QuantityWarningSchema = z.object({
  meal_item_id: z.number().nullable().optional(),
  meal_id: z.number().nullable().optional(),
  ingredient_name: z.string(),
  per_person_value: z.number(),
  per_person_unit: z.string(),
  total_value: z.number(),
  total_unit: z.string(),
  message: z.string(),
});
export type QuantityWarning = z.infer<typeof QuantityWarningSchema>;

// ==========================================================================
// Buffet templates
// ==========================================================================

export const BuffetRoleSchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string().default(''),
});
export type BuffetRole = z.infer<typeof BuffetRoleSchema>;

export const BuffetUnitSchema = z.enum(['g', 'ml']);
export type BuffetUnit = z.infer<typeof BuffetUnitSchema>;

export const BuffetTemplateRoleSchema = z.object({
  role: BuffetRoleSchema,
  amount_per_person: z.number(),
  unit: BuffetUnitSchema,
  enabled_by_default: z.boolean(),
  sort_order: z.number(),
  default_ingredient_ids: z.array(z.number()).default([]),
  default_recipe_ids: z.array(z.number()).default([]),
});
export type BuffetTemplateRole = z.infer<typeof BuffetTemplateRoleSchema>;

export const BuffetTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(''),
  meal_types: z.array(z.string()).default([]),
  sort_order: z.number().default(0),
  roles: z.array(BuffetTemplateRoleSchema).default([]),
});
export type BuffetTemplate = z.infer<typeof BuffetTemplateSchema>;

// ==========================================================================
// Buffet catalog (grouped by role)
// ==========================================================================

export const BuffetCatalogItemSchema = z.object({
  kind: z.enum(['ingredient', 'recipe']),
  id: z.number(),
  name: z.string(),
  energy_kcal_per_100g: z.number().nullable().optional(),
  price_per_kg: z.number().nullable().optional(),
  weight_per_serving_g: z.number().nullable().optional(),
  default_selected: z.boolean().default(false),
});
export type BuffetCatalogItem = z.infer<typeof BuffetCatalogItemSchema>;

export const BuffetCatalogRoleSchema = z.object({
  role: BuffetRoleSchema,
  amount_per_person: z.number().nullable().optional(),
  unit: BuffetUnitSchema.nullable().optional(),
  enabled_by_default: z.boolean().default(true),
  items: z.array(BuffetCatalogItemSchema).default([]),
});
export type BuffetCatalogRole = z.infer<typeof BuffetCatalogRoleSchema>;

export const BuffetCatalogSchema = z.object({
  template_slug: z.string().nullable().optional(),
  roles: z.array(BuffetCatalogRoleSchema).default([]),
  gram_unit_id: z.number().nullable().optional(),
  ml_unit_id: z.number().nullable().optional(),
});
export type BuffetCatalog = z.infer<typeof BuffetCatalogSchema>;

// ==========================================================================
// Buffet save / preview
// ==========================================================================

export const BuffetSelectionInSchema = z.object({
  role_slug: z.string(),
  ingredient_id: z.number().nullable().optional(),
  recipe_id: z.number().nullable().optional(),
});
export type BuffetSelectionIn = z.infer<typeof BuffetSelectionInSchema>;

export const BuffetSaveInSchema = z.object({
  template_id: z.number(),
  selections: z.array(BuffetSelectionInSchema).default([]),
  role_amounts: z.record(z.string(), z.number()).nullable().optional(),
  dry_run: z.boolean().default(false),
});
export type BuffetSaveIn = z.infer<typeof BuffetSaveInSchema>;

export const BuffetResultItemSchema = z.object({
  role_slug: z.string(),
  kind: z.enum(['ingredient', 'recipe']),
  id: z.number(),
  name: z.string(),
  amount_per_person: z.number(),
  unit: BuffetUnitSchema,
  total_amount: z.number(),
  factor: z.number(),
  energy_kcal_per_person: z.number().nullable().optional(),
  cost_per_person: z.number().nullable().optional(),
  cost_total: z.number().nullable().optional(),
});
export type BuffetResultItem = z.infer<typeof BuffetResultItemSchema>;

export const BuffetResultSchema = z.object({
  saved: z.boolean(),
  portions: z.number(),
  items: z.array(BuffetResultItemSchema).default([]),
  energy_kcal_per_person: z.number(),
  target_kcal_per_person: z.number(),
  cost_per_person: z.number(),
  cost_total: z.number(),
  warnings: z.array(QuantityWarningSchema).default([]),
});
export type BuffetResult = z.infer<typeof BuffetResultSchema>;

export const BuffetStateSelectionSchema = z.object({
  role_slug: z.string(),
  ingredient_id: z.number().nullable().optional(),
  recipe_id: z.number().nullable().optional(),
});
export type BuffetStateSelection = z.infer<typeof BuffetStateSelectionSchema>;

export const BuffetStateSchema = z.object({
  template_id: z.number().nullable().optional(),
  selections: z.array(BuffetStateSelectionSchema).default([]),
  role_amounts: z.record(z.string(), z.number()).default({}),
});
export type BuffetState = z.infer<typeof BuffetStateSchema>;
