import { describe, expect, it } from 'vitest';
import type { MealPlanDetail } from '@/schemas/mealPlan';
import { removeItemFromPlan, scaleItemInPlan } from './mealPlanOptimistic';

function plan(): MealPlanDetail {
  return {
    id: 19,
    meals: [
      {
        id: 219,
        total_cost_eur: 25.8,
        total_energy_kcal: 16497,
        items: [
          { id: 222, factor: 1, quantity: null, cost_eur: 25.8, energy_kcal: 16497 },
        ],
      },
      { id: 220, total_cost_eur: 0, total_energy_kcal: 0, items: [] },
    ],
  } as unknown as MealPlanDetail;
}

describe('removeItemFromPlan', () => {
  it('removes the item and takes its cost and energy out of the meal totals', () => {
    const next = removeItemFromPlan(plan(), 222);

    expect(next.meals[0].items).toHaveLength(0);
    expect(next.meals[0].total_cost_eur).toBe(0);
    expect(next.meals[0].total_energy_kcal).toBe(0);
  });

  it('leaves other meals and unknown ids untouched', () => {
    const base = plan();
    expect(removeItemFromPlan(base, 999).meals[0].total_cost_eur).toBe(25.8);
    expect(removeItemFromPlan(base, 222).meals[1]).toBe(base.meals[1]);
  });

  it('never goes below zero', () => {
    const base = plan();
    base.meals[0].total_cost_eur = 10;
    expect(removeItemFromPlan(base, 222).meals[0].total_cost_eur).toBe(0);
  });
});

describe('scaleItemInPlan', () => {
  it('scales cost and energy of the item and the meal totals with the factor ratio', () => {
    const next = scaleItemInPlan(plan(), 222, { factor: 2 });

    expect(next.meals[0].items[0].factor).toBe(2);
    expect(next.meals[0].items[0].cost_eur).toBeCloseTo(51.6);
    expect(next.meals[0].total_cost_eur).toBeCloseTo(51.6);
    expect(next.meals[0].total_energy_kcal).toBeCloseTo(32994);
  });

  it('scales by quantity for single ingredients', () => {
    const base = plan();
    base.meals[0].items[0] = { id: 222, factor: 1, quantity: 2, cost_eur: 4, energy_kcal: 100 } as never;
    base.meals[0].total_cost_eur = 4;
    base.meals[0].total_energy_kcal = 100;

    const next = scaleItemInPlan(base, 222, { quantity: 3 });

    expect(next.meals[0].items[0].cost_eur).toBeCloseTo(6);
    expect(next.meals[0].total_energy_kcal).toBeCloseTo(150);
  });

  it('leaves the plan to the server when there is no usable old value', () => {
    const base = plan();
    base.meals[0].items[0] = { id: 222, factor: 0, quantity: null, cost_eur: 0, energy_kcal: 0 } as never;

    expect(scaleItemInPlan(base, 222, { factor: 2 }).meals[0]).toBe(base.meals[0]);
  });

  it('keeps items without cost data as they are', () => {
    const base = plan();
    base.meals[0].items[0] = { id: 222, factor: 1, quantity: null, cost_eur: null, energy_kcal: null } as never;

    const next = scaleItemInPlan(base, 222, { factor: 3 });

    expect(next.meals[0].items[0].cost_eur).toBeNull();
    expect(next.meals[0].total_cost_eur).toBe(25.8);
  });
});
