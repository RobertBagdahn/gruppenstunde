/**
 * Tests for placeholder resolution utilities
 *
 * Tests cover:
 * - Placeholder detection ({ingredient_name}, {recipe_item_id}, {1}, etc.)
 * - Placeholder replacement with actual ingredient names
 * - Edge cases (missing items, mixed formats, special characters)
 * - Batch resolution
 */

import { describe, it, expect } from 'vitest';
import {
  resolveStepPlaceholders,
  batchResolvePlaceholders,
  hasPlaceholders,
  extractPlaceholders,
  type RecipeItemMap,
} from '@/services/stepHelpers';
import type { RecipeStep } from '@/schemas/recipeStep';

const createMockStep = (overrides?: Partial<RecipeStep>): RecipeStep => ({
  id: 1,
  sort_order: 1,
  instruction: 'Test instruction',
  duration_minutes: null,
  section: '',
  step_ingredients: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('stepHelpers', () => {
  describe('hasPlaceholders', () => {
    it('should detect ingredient_name placeholders', () => {
      const instruction = 'Add {ingredient_name} to the bowl';
      expect(hasPlaceholders(instruction)).toBe(true);
    });

    it('should detect recipe_item_id placeholders', () => {
      const instruction = 'Mix {recipe_item_id} with {name}';
      expect(hasPlaceholders(instruction)).toBe(true);
    });

    it('should detect numeric placeholders', () => {
      expect(hasPlaceholders('Use {1} cups of {2}')).toBe(true);
      expect(hasPlaceholders('Add {5} to mixture')).toBe(true);
    });

    it('should return false for instructions without placeholders', () => {
      const instruction = 'Mix and stir thoroughly';
      expect(hasPlaceholders(instruction)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(hasPlaceholders('')).toBe(false);
      expect(hasPlaceholders('No placeholders here')).toBe(false);
      expect(hasPlaceholders('{}')).toBe(false);
    });
  });

  describe('extractPlaceholders', () => {
    it('should extract ingredient_name placeholders', () => {
      const instruction = 'Add {ingredient_name} and {ingredient_name}';
      const placeholders = extractPlaceholders(instruction);
      expect(placeholders).toContain('ingredient_name');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('should extract numeric placeholders', () => {
      const instruction = 'Use {1} and {2} from {3}';
      const placeholders = extractPlaceholders(instruction);
      expect(placeholders.length).toBe(3);
      expect(placeholders).toEqual(['1', '2', '3']);
    });

    it('should return empty array for no placeholders', () => {
      const placeholders = extractPlaceholders('No placeholders');
      expect(placeholders).toEqual([]);
    });

    it('should extract all placeholder types', () => {
      const instruction = 'Mix {1} with {name} using {id}';
      const placeholders = extractPlaceholders(instruction);
      expect(placeholders).toContain('1');
      expect(placeholders).toContain('name');
      expect(placeholders).toContain('id');
    });
  });

  describe('resolveStepPlaceholders', () => {
    it('should resolve ingredient_name placeholders', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Salt' },
      };
      const step = createMockStep({
        instruction: 'Add {ingredient_name} to the bowl',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Salt');
    });

    it('should resolve numeric placeholders by index', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Water' },
        2: { id: 2, name: 'Milk' },
      };
      const step = createMockStep({
        instruction: 'Use {1} cups of {2}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
          { id: 2, recipe_item_id: 2, quantity_modifier: 1.0, preparation: '', sort_order: 2 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Water');
      expect(resolved).toContain('Milk');
    });

    it('should handle missing items gracefully', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Salt' },
      };
      const step = createMockStep({
        instruction: 'Add {1} to mix',
        step_ingredients: [
          { id: 1, recipe_item_id: 999, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      // Should handle missing item gracefully
      expect(resolved).toBeDefined();
    });

    it('should handle empty instruction', () => {
      const itemMap: RecipeItemMap = {};
      const step = createMockStep({
        instruction: '',
        step_ingredients: [],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toBe('');
    });

    it('should handle empty items list', () => {
      const itemMap: RecipeItemMap = {};
      const step = createMockStep({
        instruction: 'Add {1} to bowl',
        step_ingredients: [],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      // Should handle gracefully
      expect(resolved).toBeDefined();
    });

    it('should preserve item display name from portion ingredient', () => {
      const itemMap: RecipeItemMap = {
        1: {
          id: 1,
          name: 'Base Name',
          portion: {
            ingredient: { name: 'Preferred Display Name' },
          },
        },
      };
      const step = createMockStep({
        instruction: 'Use {1}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Preferred Display Name');
    });

    it('should handle special characters in ingredient names', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Crème Fraîche (30%)' },
      };
      const step = createMockStep({
        instruction: 'Use {1}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Crème Fraîche (30%)');
    });

    it('should handle name alias placeholder', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Flour' },
      };
      const step = createMockStep({
        instruction: 'Mix {name} with water',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Flour');
    });

    it('should handle id alias placeholder', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Sugar' },
      };
      const step = createMockStep({
        instruction: 'Add {id}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      // Should resolve to ingredient ID or name
      expect(resolved).toBeDefined();
    });
  });

  describe('batchResolvePlaceholders', () => {
    it('should resolve placeholders in multiple steps', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Flour' },
        2: { id: 2, name: 'Water' },
      };
      const steps = [
        createMockStep({
          id: 1,
          instruction: 'Add {1}',
          step_ingredients: [
            { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
          ],
        }),
        createMockStep({
          id: 2,
          instruction: 'Mix with {2}',
          step_ingredients: [
            { id: 2, recipe_item_id: 2, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
          ],
        }),
      ];

      const resolved = batchResolvePlaceholders(steps, itemMap);

      expect(resolved.size).toBe(2);
      expect(resolved.get(1)).toContain('Flour');
      expect(resolved.get(2)).toContain('Water');
    });

    it('should handle steps without placeholders', () => {
      const itemMap: RecipeItemMap = {};
      const steps = [
        createMockStep({
          id: 1,
          instruction: 'Mix thoroughly',
        }),
        createMockStep({
          id: 2,
          instruction: 'Add {1}',
          step_ingredients: [
            { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
          ],
        }),
      ];

      const resolved = batchResolvePlaceholders(steps, itemMap);

      expect(resolved.size).toBe(2);
      expect(resolved.get(1)).toBe('Mix thoroughly');
    });

    it('should handle empty step list', () => {
      const resolved = batchResolvePlaceholders([], {});
      expect(resolved.size).toBe(0);
    });

    it('should return map with correct step IDs', () => {
      const itemMap: RecipeItemMap = {};
      const steps = [
        createMockStep({ id: 1 }),
        createMockStep({ id: 2 }),
        createMockStep({ id: 3 }),
      ];

      const resolved = batchResolvePlaceholders(steps, itemMap);

      expect(resolved.has(1)).toBe(true);
      expect(resolved.has(2)).toBe(true);
      expect(resolved.has(3)).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple occurrences of same placeholder', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Salt' },
      };
      const step = createMockStep({
        instruction: 'Add {1}, then {1}, finally {1}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect((resolved.match(/Salt/g) || []).length).toBe(3);
    });

    it('should handle adjacent placeholders', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'A' },
        2: { id: 2, name: 'B' },
        3: { id: 3, name: 'C' },
      };
      const step = createMockStep({
        instruction: 'Mix {1}{2}{3}',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
          { id: 2, recipe_item_id: 2, quantity_modifier: 1.0, preparation: '', sort_order: 2 },
          { id: 3, recipe_item_id: 3, quantity_modifier: 1.0, preparation: '', sort_order: 3 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('A');
      expect(resolved).toContain('B');
      expect(resolved).toContain('C');
    });

    it('should handle unicode characters in names', () => {
      const itemMap: RecipeItemMap = {
        1: { id: 1, name: 'Öl' },
      };
      const step = createMockStep({
        instruction: 'Add {1} zur Mischung',
        step_ingredients: [
          { id: 1, recipe_item_id: 1, quantity_modifier: 1.0, preparation: '', sort_order: 1 },
        ],
      });

      const resolved = resolveStepPlaceholders(step, itemMap);
      expect(resolved).toContain('Öl');
    });
  });
});
