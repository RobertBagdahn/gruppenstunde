/**
 * Tests for TanStack Query hooks (useRecipeSteps, useBatchUpdateSteps, etc.)
 *
 * Tests cover:
 * - Successful API calls
 * - Error handling
 * - Loading states
 * - CSRF token inclusion
 * - Mutation payload validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRecipeSteps,
  useBatchUpdateSteps,
  useGenerateStepsFromItems,
  useImproveStepInstruction,
  useSuggestIngredientAssignment,
} from '@/hooks/useRecipeSteps';
import type { RecipeStep } from '@/schemas/recipeStep';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

// Mock getCsrfToken
vi.mock('@/utils/csrf', () => ({
  getCsrfToken: () => 'test-csrf-token',
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

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

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createQueryClient();
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );
};

describe('Recipe Steps Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRecipeSteps', () => {
    it('should fetch recipe steps successfully', async () => {
      const mockSteps = [createMockStep()];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSteps,
      });

      const { result } = renderHook(() => useRecipeSteps('test-recipe'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSteps);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRecipeSteps('test-recipe'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should show loading state', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useRecipeSteps('test-recipe'), {
        wrapper,
      });

      expect(result.current.isPending).toBe(true);
    });

    it('should construct correct API URL', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() => useRecipeSteps('my-recipe'), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/my-recipe/steps/'),
          expect.any(Object)
        );
      });
    });
  });

  describe('useBatchUpdateSteps', () => {
    it('should send batch update request', async () => {
      const mockSteps = [createMockStep()];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useBatchUpdateSteps(), { wrapper });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        steps: mockSteps,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-recipe/steps/batch'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-CSRFToken': 'test-csrf-token',
          }),
        })
      );
    });

    it('should include CSRF token in request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useBatchUpdateSteps(), { wrapper });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        steps: [],
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const call = (global.fetch as any).mock.calls[0];
      expect(call[1].headers['X-CSRFToken']).toBe('test-csrf-token');
    });

    it('should handle mutation errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Invalid request' }),
      });

      const { result } = renderHook(() => useBatchUpdateSteps(), { wrapper });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        steps: [],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useGenerateStepsFromItems', () => {
    it('should generate steps from ingredients', async () => {
      const generatedSteps = [
        createMockStep({ instruction: 'Generated step' }),
      ];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ steps: generatedSteps }),
      });

      const { result } = renderHook(() => useGenerateStepsFromItems(), {
        wrapper,
      });

      result.current.mutate({ recipe_slug: 'test-recipe' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.steps).toEqual(generatedSteps);
    });

    it('should include CSRF token and correct endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ steps: [] }),
      });

      const { result } = renderHook(() => useGenerateStepsFromItems(), {
        wrapper,
      });

      result.current.mutate({ recipe_slug: 'my-recipe' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/my-recipe/steps/generate-from-items/'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'X-CSRFToken': 'test-csrf-token',
            }),
          })
        );
      });
    });
  });

  describe('useImproveStepInstruction', () => {
    it('should improve step instruction with tone', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          improved_instruction: 'Improved instruction',
          step_id: 1,
        }),
      });

      const { result } = renderHook(() => useImproveStepInstruction(), {
        wrapper,
      });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        step_id: 1,
        tone: 'präzise',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.improved_instruction).toBe(
        'Improved instruction'
      );
    });

    it('should send tone in request body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          improved_instruction: 'Test',
          step_id: 1,
        }),
      });

      const { result } = renderHook(() => useImproveStepInstruction(), {
        wrapper,
      });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        step_id: 1,
        tone: 'ausführlich',
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.tone).toBe('ausführlich');
    });
  });

  describe('useSuggestIngredientAssignment', () => {
    it('should suggest ingredient assignments', async () => {
      const suggestions = [
        {
          id: 1,
          name: 'Ingredient 1',
          preparation: 'diced',
          confidence: 0.95,
        },
      ];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions }),
      });

      const { result } = renderHook(
        () => useSuggestIngredientAssignment(),
        { wrapper }
      );

      result.current.mutate({
        recipe_slug: 'test-recipe',
        step_instruction: 'Mix the ingredients',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.suggestions).toEqual(suggestions);
    });

    it('should include step instruction in request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: [] }),
      });

      const { result } = renderHook(
        () => useSuggestIngredientAssignment(),
        { wrapper }
      );

      result.current.mutate({
        recipe_slug: 'test-recipe',
        step_instruction: 'Boil the water',
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.step_instruction).toBe('Boil the water');
    });
  });

  describe('error handling', () => {
    it('should throw error with detail message from API', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Specific error message' }),
      });

      const { result } = renderHook(() => useBatchUpdateSteps(), { wrapper });

      result.current.mutate({
        recipe_slug: 'test-recipe',
        steps: [],
      });

      await waitFor(() => {
        expect(result.current.error?.message).toContain(
          'Specific error message'
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRecipeSteps('test-recipe'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
