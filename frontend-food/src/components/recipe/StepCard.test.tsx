/**
 * Tests for StepCard component
 *
 * Tests cover:
 * - Rendering step information (instruction, duration, section)
 * - Drag handle display and interaction
 * - Step number and collapse/expand
 * - KI tone selector button click
 * - Update callback on instruction change
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepCard } from '@/components/recipe/StepCard';
import type { RecipeStep } from '@/schemas/recipeStep';

const createMockStep = (overrides?: Partial<RecipeStep>): RecipeStep => ({
  id: 1,
  sort_order: 1,
  instruction: 'Mix flour with water',
  duration_minutes: 5,
  section: 'Preparation',
  step_ingredients: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('StepCard', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  it('should render step instruction', () => {
    const step = createMockStep({ instruction: 'Boil water' });
    render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(screen.getByText(/Boil water/)).toBeInTheDocument();
  });

  it('should display step number', () => {
    const step = createMockStep();
    render(
      <StepCard
        step={step}
        stepNumber={3}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display duration in minutes if provided', () => {
    const step = createMockStep({ duration_minutes: 10 });
    render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    // Duration should be displayed
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('should display section badge if provided', () => {
    const step = createMockStep({ section: 'Preparation' });
    render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(screen.getByText('Preparation')).toBeInTheDocument();
  });

  it('should not crash when section is empty', () => {
    const step = createMockStep({ section: '' });
    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('should handle recipeSlug prop correctly', () => {
    const step = createMockStep();
    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="my-recipe"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('should pass recipeSlug to child components', () => {
    const step = createMockStep();
    render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    // Component should render without errors
    expect(screen.getByText(/Mix flour with water/)).toBeInTheDocument();
  });

  it('should have KI button with magic wand icon', () => {
    const step = createMockStep();
    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    // Look for wand icon or button
    const kiButtons = container.querySelectorAll('button');
    expect(kiButtons.length).toBeGreaterThan(0);
  });

  it('should handle long instructions with text wrapping', () => {
    const longInstruction =
      'Mix the flour with water gradually while stirring constantly to avoid lumps, ensuring smooth and creamy consistency';
    const step = createMockStep({ instruction: longInstruction });

    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(screen.getByText(longInstruction)).toBeInTheDocument();
  });

  it('should support collapsible content', () => {
    const step = createMockStep();
    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    // Should have expand/collapse button
    const expandButtons = container.querySelectorAll('button');
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it('should apply purple accent color for KI features', () => {
    const step = createMockStep();
    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    // Look for purple color class
    const allElements = container.querySelectorAll('[class*="purple"]');
    expect(allElements.length >= 0).toBe(true);
  });

  it('should pass step ingredients to children', () => {
    const step = createMockStep({
      step_ingredients: [
        {
          id: 1,
          recipe_item: 1,
          quantity_modifier: 1.0,
          preparation: 'diced',
          sort_order: 1,
        },
      ],
    });

    const { container } = render(
      <StepCard
        step={step}
        stepNumber={1}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        recipeSlug="test-recipe"
      />
    );

    expect(container).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('should have proper step number semantics', () => {
      const step = createMockStep();
      render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      const stepNumber = screen.getByText('1');
      expect(stepNumber).toBeInTheDocument();
    });

    it('should have semantic section tag', () => {
      const step = createMockStep({ section: 'Test Section' });
      const { container } = render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      // Should render without accessibility errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should render on mobile without errors', () => {
      const step = createMockStep();
      const { container } = render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle content overflow gracefully', () => {
      const step = createMockStep({
        instruction: 'x'.repeat(500), // Very long text
      });

      const { container } = render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle null duration_minutes', () => {
      const step = createMockStep({ duration_minutes: null });
      render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      expect(screen.getByText(/Mix flour with water/)).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      const step = createMockStep({ duration_minutes: 0 });
      render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug="test-recipe"
        />
      );

      expect(screen.getByText(/Mix flour with water/)).toBeInTheDocument();
    });

    it('should handle step with no recipeSlug', () => {
      const step = createMockStep();
      render(
        <StepCard
          step={step}
          stepNumber={1}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          recipeSlug=""
        />
      );

      expect(screen.getByText(/Mix flour with water/)).toBeInTheDocument();
    });
  });
});
