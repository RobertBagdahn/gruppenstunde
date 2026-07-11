/**
 * Step Placeholder Resolution Services
 *
 * Utilities for resolving placeholder syntax in recipe step instructions:
 * - {ingredient_name}
 * - {recipe_item_id}
 */

import type { RecipeStep } from '@/schemas/recipeStep';

/**
 * Map recipe items by ID and name for quick lookup
 */
export interface RecipeItemMap {
  [key: number]: {
    id: number;
    name: string;
    portion?: {
      ingredient?: { name?: string };
      measuring_unit?: { name?: string };
    };
  };
}

/**
 * Resolve placeholders in a step instruction
 *
 * Supports:
 * - {ingredient_name} → looks up ingredient by ID from step_ingredients
 * - {recipe_item_id} → direct reference to recipe item ID
 * - {name} → alias for ingredient_name
 * - {id} → alias for recipe_item_id
 *
 * @param step - RecipeStep with instruction text
 * @param recipeItemMap - Map of recipe items by ID
 * @returns Resolved instruction text with placeholders replaced
 *
 * @example
 * ```typescript
 * const step = {
 *   id: 1,
 *   instruction: 'Mix {ingredient_name} with water',
 *   step_ingredients: [
 *     { recipe_item_id: 42, ... }
 *   ]
 * };
 * const map = { 42: { id: 42, name: 'flour' } };
 * resolveStepPlaceholders(step, map)
 * // => 'Mix flour with water'
 * ```
 */
export function resolveStepPlaceholders(
  step: RecipeStep,
  recipeItemMap: RecipeItemMap
): string {
  let text = step.instruction;

  // Get first ingredient as default (for single-placeholder cases)
  const firstIngredient = step.step_ingredients[0];
  const defaultItemId = firstIngredient?.recipe_item_id;
  const defaultItemName = defaultItemId
    ? getItemDisplayName(recipeItemMap[defaultItemId])
    : '';

  // Replace {ingredient_name} / {name} with first ingredient's name
  text = text
    .replace(/\{ingredient_name\}/gi, defaultItemName)
    .replace(/\{name\}/gi, defaultItemName);

  // Replace {recipe_item_id} / {id} with first ingredient's ID
  text = text
    .replace(/\{recipe_item_id\}/gi, String(defaultItemId || ''))
    .replace(/\{id\}/gi, String(defaultItemId || ''));

  // Replace numbered references: {1} → first ingredient, {2} → second, etc.
  for (let i = 0; i < step.step_ingredients.length; i++) {
    const ing = step.step_ingredients[i];
    const item = recipeItemMap[ing.recipe_item_id];
    const displayName = getItemDisplayName(item);
    text = text.replace(new RegExp(`\\{${i + 1}\\}`, 'g'), displayName);
  }

  return text;
}

/**
 * Get human-readable name for a recipe item
 *
 * Priority:
 * 1. portion.ingredient.name (full ingredient name)
 * 2. item.name (fallback)
 * 3. 'Zutat #X' (if not found)
 */
function getItemDisplayName(
  item?: RecipeItemMap[number]
): string {
  if (!item) return '';
  return (
    item.portion?.ingredient?.name ||
    item.name ||
    `Zutat #${item.id}`
  );
}

/**
 * Batch resolve placeholders for multiple steps
 *
 * @param steps - Array of recipe steps
 * @param recipeItemMap - Map of recipe items
 * @returns Map of step ID to resolved instruction
 */
export function batchResolvePlaceholders(
  steps: RecipeStep[],
  recipeItemMap: RecipeItemMap
): Map<number, string> {
  const resolved = new Map<number, string>();
  for (const step of steps) {
    resolved.set(step.id, resolveStepPlaceholders(step, recipeItemMap));
  }
  return resolved;
}

/**
 * Check if a string contains placeholder syntax
 */
export function hasPlaceholders(text: string): boolean {
  return /\{[\w_]+\}/i.test(text);
}

/**
 * Extract placeholder names from instruction text
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([\w_]+)\}/g) || [];
  return matches.map(m => m.slice(1, -1));
}
