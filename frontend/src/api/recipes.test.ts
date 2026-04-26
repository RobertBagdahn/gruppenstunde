/**
 * Tests for invalidateRecipeData helper in api/recipes.ts.
 *
 * Asserts that all expected query keys are invalidated when the helper is called.
 */
import { describe, expect, it, vi } from 'vitest';
import { invalidateRecipeData } from './recipes';
import { QueryClient } from '@tanstack/react-query';

describe('invalidateRecipeData', () => {
  it('invalidates all expected query keys', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => Promise.resolve());

    const recipeId = 42;
    invalidateRecipeData(queryClient, recipeId);

    const expectedKeys = [
      ['recipe', recipeId],
      ['recipe', 'slug'],
      ['recipe-items', recipeId],
      ['recipe-hints', recipeId],
      ['recipe-nutri-score', recipeId],
      ['recipe-nutrition-breakdown', recipeId],
      ['recipe-nutri-improvements', recipeId],
      ['recipes'],
      ['my-recipes'],
    ];

    expect(spy).toHaveBeenCalledTimes(expectedKeys.length);

    for (const key of expectedKeys) {
      expect(spy).toHaveBeenCalledWith({ queryKey: key });
    }

    spy.mockRestore();
  });
});
