// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipeHistogram, { bucketLabel } from './RecipeHistogram';

describe('bucketLabel', () => {
  it('uses German decimals and never NaN', () => {
    expect(bucketLabel({ min: 0.5, max: 1.25 }, '€')).toBe('0,5–1,3 €');
    expect(bucketLabel({ min: 0, max: 352 }, 'kcal')).toBe('0–352 kcal');
  });

  it('keeps thousands readable instead of parsing them away', () => {
    expect(bucketLabel({ min: 1000, max: 1500 }, 'kcal')).toBe('1.000–1.500 kcal');
  });
});

describe('RecipeHistogram', () => {
  it('shows the recipe value as German text', () => {
    render(
      <RecipeHistogram
        buckets={[{ min: 0, max: 1, count: 3 }]}
        recipeValue={0.35}
        label="Preisverteilung (€ pro Portion)"
        unit="€"
      />,
    );

    expect(screen.getByText('0,4 €')).toBeDefined();
    expect(document.body.textContent).not.toContain('NaN');
  });
});
