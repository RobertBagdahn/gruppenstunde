import { describe, expect, it } from 'vitest';
import { MealPlanCreateInSchema, MealPlanUpdateInSchema } from '@/schemas/mealPlan';
import {
  activityFactorError,
  dayPartFactorError,
  normPortionsError,
  overridePortionsError,
  reserveFactorError,
} from './mealPlanBounds';

describe('mealPlanBounds', () => {
  it('accepts values on the boundaries and rejects values just outside', () => {
    expect(reserveFactorError(1.0)).toBeNull();
    expect(reserveFactorError(2.0)).toBeNull();
    expect(reserveFactorError(0.99)).toContain('1,0 und 2,0');
    expect(reserveFactorError(2.01)).not.toBeNull();
    expect(activityFactorError(2.5)).toBeNull();
    expect(activityFactorError(1e9)).not.toBeNull();
    expect(dayPartFactorError(1)).toBeNull();
    expect(dayPartFactorError(-0.5)).not.toBeNull();
    expect(normPortionsError(1000)).toBeNull();
    expect(normPortionsError(0)).not.toBeNull();
    expect(normPortionsError(-5e9)).not.toBeNull();
    expect(overridePortionsError(1)).toBeNull();
    expect(overridePortionsError(0)).not.toBeNull();
    expect(overridePortionsError(1.5)).not.toBeNull();
    expect(overridePortionsError(1001)).not.toBeNull();
  });

  it('applies the same limits in the Zod schemas', () => {
    expect(MealPlanCreateInSchema.safeParse({ name: 'Plan', reserve_factor: -100 }).success).toBe(false);
    expect(MealPlanCreateInSchema.safeParse({ name: 'Plan', activity_factor: 1e9 }).success).toBe(false);
    expect(MealPlanCreateInSchema.safeParse({ name: 'Plan', reserve_factor: 2, activity_factor: 1, norm_portions: 1000 }).success).toBe(true);
    expect(MealPlanUpdateInSchema.safeParse({ day_part_factors: { breakfast: 0.6, lunch: 0.6, dinner: 0.5 } }).success).toBe(false);
    expect(MealPlanUpdateInSchema.safeParse({ day_part_factors: { breakfast: -0.5 } }).success).toBe(false);
    expect(MealPlanUpdateInSchema.safeParse({ name: 'Nur Name' }).success).toBe(true);
  });
});
