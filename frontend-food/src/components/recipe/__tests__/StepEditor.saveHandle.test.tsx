import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StepEditor, { type StepEditorHandle } from '@/components/recipe/StepEditor';
import { useRecipeStepStore } from '@/store/useRecipeStepStore';
import { useRecipeSteps, useBatchUpdateSteps, useGenerateStepsFromItems } from '@/hooks/useRecipeSteps';
import type { RecipeStep } from '@/schemas/recipeStep';

vi.mock('@/hooks/useRecipeSteps', () => ({
  useRecipeSteps: vi.fn(),
  useBatchUpdateSteps: vi.fn(),
  useGenerateStepsFromItems: vi.fn(),
  useSuggestIngredientAssignment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useImproveStepInstruction: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const step: RecipeStep = {
  id: 1,
  sort_order: 0,
  instruction: 'Alt',
  duration_minutes: null,
  section: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  step_ingredients: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('StepEditor save handle', () => {
  beforeEach(() => {
    useRecipeStepStore.setState({
      steps: [],
      recipeSlug: null,
      lastState: [],
      selectedStepId: null,
      hasChanges: false,
      canUndo: false,
      canRedo: false,
      isLoading: false,
      error: null,
    });
    vi.mocked(useRecipeSteps).mockReturnValue({ data: [step], isLoading: false, error: null } as never);
    vi.mocked(useGenerateStepsFromItems).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('returns success and clears dirty state after the batch request', async () => {
    const mutateAsync = vi.fn().mockResolvedValue([step]);
    vi.mocked(useBatchUpdateSteps).mockReturnValue({ mutateAsync, isPending: false } as never);
    const ref = { current: null as StepEditorHandle | null };
    render(<StepEditor ref={ref} recipeSlug="recipe-a" />, { wrapper });

    act(() => {
      useRecipeStepStore.getState().updateStep(1, { instruction: 'Manuell geändert' });
    });
    const result = await ref.current?.save();

    expect(result).toBe(true);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(useRecipeStepStore.getState().hasChanges).toBe(false);
  });

  it('keeps dirty state when the batch request fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Speichern fehlgeschlagen'));
    vi.mocked(useBatchUpdateSteps).mockReturnValue({ mutateAsync, isPending: false } as never);
    const ref = { current: null as StepEditorHandle | null };
    render(<StepEditor ref={ref} recipeSlug="recipe-a" />, { wrapper });

    act(() => {
      useRecipeStepStore.getState().updateStep(1, { instruction: 'Manuell geändert' });
    });
    const result = await ref.current?.save();

    expect(result).toBe(false);
    expect(useRecipeStepStore.getState().hasChanges).toBe(true);
    expect(useRecipeStepStore.getState().steps[0].instruction).toBe('Manuell geändert');
  });

  it('saves immediately when textarea value changes without explicit blur', async () => {
    const mutateAsync = vi.fn().mockImplementation(async (payload) => payload.steps);
    vi.mocked(useBatchUpdateSteps).mockReturnValue({ mutateAsync, isPending: false } as never);
    const ref = { current: null as StepEditorHandle | null };
    render(<StepEditor ref={ref} recipeSlug="recipe-a" />, { wrapper });

    fireEvent.click(screen.getByText('Schritt 1'));
    const textarea = screen.getByTestId('recipe-step-instruction');
    fireEvent.change(textarea, { target: { value: 'Zwiebeln frisch anbraten' } });

    // Directly call save() without blur
    const result = await ref.current?.save();

    expect(result).toBe(true);
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe_slug: 'recipe-a',
        steps: expect.arrayContaining([
          expect.objectContaining({
            instruction: 'Zwiebeln frisch anbraten',
          }),
        ]),
      }),
    );
  });
});
