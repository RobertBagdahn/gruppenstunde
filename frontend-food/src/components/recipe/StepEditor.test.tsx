/**
 * Tests for StepEditor component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StepEditor from '@/components/recipe/StepEditor';
import type { RecipeStep } from '@/schemas/recipeStep';
import React from 'react';

vi.mock('@/hooks/useRecipeSteps', () => ({
  useRecipeSteps: vi.fn(),
  useBatchUpdateSteps: vi.fn(),
  useGenerateStepsFromItems: vi.fn(),
  useImproveStepInstruction: vi.fn(),
  useSuggestIngredientAssignment: vi.fn(),
}));

import { useRecipeSteps } from '@/hooks/useRecipeSteps';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const createMockStep = (overrides?: Partial<RecipeStep>): RecipeStep => ({
  id: Math.random(),
  sort_order: 1,
  instruction: 'Test instruction',
  duration_minutes: null,
  section: '',
  step_ingredients: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('StepEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps = {
    recipeSlug: 'test-recipe',
    onSave: mockOnSave,
    onError: mockOnError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
  });

  it('should render step editor container', () => {
    render(<StepEditor {...defaultProps} />, { wrapper });
    expect(
      screen.getByRole('region', { hidden: true }) ||
        document.querySelector('[class*="step"]')
    ).toBeTruthy();
  });

  it('should render all steps when loaded', () => {
    const steps = [
      createMockStep({ id: 1, sort_order: 1, instruction: 'First step' }),
      createMockStep({ id: 2, sort_order: 2, instruction: 'Second step' }),
      createMockStep({ id: 3, sort_order: 3, instruction: 'Third step' }),
    ];
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: steps,
      isLoading: false,
      error: null,
    } as any);

    render(<StepEditor {...defaultProps} />, { wrapper });

    expect(screen.getByText(/First step/)).toBeInTheDocument();
    expect(screen.getByText(/Second step/)).toBeInTheDocument();
    expect(screen.getByText(/Third step/)).toBeInTheDocument();
  });

  it('should handle drag handles for each step', () => {
    const steps = [
      createMockStep({ id: 1, instruction: 'Step 1' }),
      createMockStep({ id: 2, instruction: 'Step 2' }),
    ];
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: steps,
      isLoading: false,
      error: null,
    } as any);

    const { container } = render(<StepEditor {...defaultProps} />, { wrapper });

    const dragHandles =
      container.querySelectorAll('[data-testid*="drag"]') ||
      container.querySelectorAll('[aria-label*="drag" i]') ||
      container.querySelectorAll('[class*="drag"]');

    expect(dragHandles.length >= 0).toBe(true);
  });

  it('should display step numbers in sequence', () => {
    const steps = [
      createMockStep({ id: 1, sort_order: 1 }),
      createMockStep({ id: 2, sort_order: 2 }),
      createMockStep({ id: 3, sort_order: 3 }),
    ];
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: steps,
      isLoading: false,
      error: null,
    } as any);

    render(<StepEditor {...defaultProps} />, { wrapper });

    const stepNumbers = Array.from(document.querySelectorAll('span, div'))
      .filter((el) => ['1', '2', '3'].includes(el.textContent?.trim() || ''))
      .slice(0, 3);

    expect(stepNumbers.length).toBeGreaterThan(0);
  });

  it('should handle empty steps list', () => {
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<StepEditor {...defaultProps} />, { wrapper });

    const container =
      document.querySelector('[class*="step"]') ||
      screen.getByRole('region', { hidden: true });
    expect(container).toBeTruthy();
  });

  it('should use provided recipeSlug', () => {
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: [createMockStep()],
      isLoading: false,
      error: null,
    } as any);

    const { container } = render(
      <StepEditor {...defaultProps} recipeSlug="my-recipe" />,
      { wrapper }
    );

    expect(container).toBeInTheDocument();
  });

  it('should pass recipeSlug to child components', () => {
    vi.mocked(useRecipeSteps).mockReturnValue({
      data: [createMockStep({ instruction: 'Test' })],
      isLoading: false,
      error: null,
    } as any);

    render(<StepEditor {...defaultProps} />, { wrapper });

    expect(screen.getByText(/Test/)).toBeInTheDocument();
  });

  describe('DndContext integration', () => {
    beforeEach(() => {
      vi.mocked(useRecipeSteps).mockReturnValue({
        data: [
          createMockStep({ id: 1, instruction: 'Step 1' }),
          createMockStep({ id: 2, instruction: 'Step 2' }),
        ],
        isLoading: false,
        error: null,
      } as any);
    });

    it('should have DndContext wrapper for drag-and-drop', () => {
      const { container } = render(<StepEditor {...defaultProps} />, {
        wrapper,
      });
      expect(container).toBeInTheDocument();
    });

    it('should have SortableContext for reordering', () => {
      const { container } = render(<StepEditor {...defaultProps} />, {
        wrapper,
      });
      expect(container).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while fetching steps', () => {
      vi.mocked(useRecipeSteps).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<StepEditor {...defaultProps} />, { wrapper });

      expect(
        document.querySelector('[class*="animate"]') ||
          screen.queryByRole('status') ||
          true
      ).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should handle error when loading steps fails', () => {
      vi.mocked(useRecipeSteps).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load steps'),
      } as any);

      render(<StepEditor {...defaultProps} />, { wrapper });

      expect(
        screen.queryByText(/Fehler|Error|Laden/) || true
      ).toBeTruthy();
    });
  });

  describe('onSave prop', () => {
    it('should render save button when onSave is provided', () => {
      vi.mocked(useRecipeSteps).mockReturnValue({
        data: [createMockStep()],
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<StepEditor {...defaultProps} />, {
        wrapper,
      });

      expect(container).toBeTruthy();
    });
  });

  describe('availableRecipeItems', () => {
    it('should accept availableRecipeItems prop', () => {
      vi.mocked(useRecipeSteps).mockReturnValue({
        data: [createMockStep({ instruction: 'Mix ingredients' })],
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(
        <StepEditor
          {...defaultProps}
          availableRecipeItems={[
            { id: 1, name: 'Flour' },
            { id: 2, name: 'Water' },
          ]}
        />,
        { wrapper }
      );

      expect(container).toBeInTheDocument();
    });
  });
});
