import { describe, it, expect } from 'vitest';
import {
  rebalanceShares,
  beToGrams,
  basisKcalPerPerson,
  toppingKcalPerPerson,
  toppingWeightForIntensity,
  belagCoverageRatio,
  isBelagCovered,
  normalizeBePerPerson,
  drinkKcalFromRecipes,
  energyTargetKcal,
  NORM_PERSON_DAILY_KCAL,
  type RecipeEnergyData,
} from './breakfastCalc';
import type { BasisSelection, ToppingSelection, WizardState } from '@/schemas/breakfast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBasis(overrides: Partial<BasisSelection> = {}): BasisSelection {
  return {
    ingredientId: 1,
    name: 'Weizenbrot',
    sharePercent: 100,
    locked: false,
    sliceWeightG: 40,
    energyKcal100g: 250,
    ...overrides,
  };
}

function makeTopping(overrides: Partial<ToppingSelection> = {}): ToppingSelection {
  return {
    ingredientId: 2,
    name: 'Butter',
    sharePercent: 100,
    energyKcal100g: 740,
    pricePerKg: null,
    portions: [
      { id: 1, name: 'Belag knapp', weight_g: 10, is_default: false, quantity: 1, measuring_unit_id: 1, priority: 0 },
      { id: 2, name: 'Belag normal', weight_g: 15, is_default: true, quantity: 1, measuring_unit_id: 1, priority: 0 },
      { id: 3, name: 'Belag üppig', weight_g: 25, is_default: false, quantity: 1, measuring_unit_id: 1, priority: 0 },
    ],
    locked: false,
    ...overrides,
  };
}

function makeWizardState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    bePerPerson: 3,
    basis: [makeBasis()],
    toppings: [makeTopping()],
    globalIntensity: 'normal',
    warmDishRecipeIds: [],
    warmDishFactors: {},
    warmDishRecipeNames: {},
    extraIngredients: {},
    extraIngredientNames: {},
    drinkRecipeIds: [],
    drinkFactors: {},
    drinkRecipeNames: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// rebalanceShares — Largest Remainder Method
// ---------------------------------------------------------------------------

describe('rebalanceShares', () => {
  it('produces a sum of exactly 100 after rebalance', () => {
    const items = [
      { sharePercent: 33, locked: false },
      { sharePercent: 33, locked: false },
      { sharePercent: 34, locked: false },
    ];
    const result = rebalanceShares(items, 0, 60);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
    expect(result[0].sharePercent).toBe(60);
  });

  it('distributes remaining 100 correctly among 3 equal items', () => {
    // changedIndex=0 gets 1, other two share 99 → each should get ~49.5 → [50,49] or [49,50]
    const items = [
      { sharePercent: 33, locked: false },
      { sharePercent: 33, locked: false },
      { sharePercent: 34, locked: false },
    ];
    const result = rebalanceShares(items, 0, 1);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
    expect(result[0].sharePercent).toBe(1);
    // Other two sum to 99
    expect(result[1].sharePercent + result[2].sharePercent).toBe(99);
  });

  it('respects locked items and does not change them', () => {
    const items = [
      { sharePercent: 50, locked: true },
      { sharePercent: 30, locked: false },
      { sharePercent: 20, locked: false },
    ];
    const result = rebalanceShares(items, 1, 40);
    expect(result[0].sharePercent).toBe(50); // locked, unchanged
    expect(result[1].sharePercent).toBe(40); // changed
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
  });

  it('handles 2 items: remaining=1 produces [1,0] or [0,1], never [0.5,0.5]', () => {
    const items = [
      { sharePercent: 50, locked: false },
      { sharePercent: 50, locked: false },
    ];
    const result = rebalanceShares(items, 0, 99);
    expect(result[0].sharePercent).toBe(99);
    expect(result[1].sharePercent).toBe(1);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
  });

  it('sums to exactly 100 with 5 equal unlocked items', () => {
    const items = Array.from({ length: 5 }, () => ({ sharePercent: 20, locked: false }));
    const result = rebalanceShares(items, 0, 23);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
  });

  it('does not change unchanged item when all others are locked', () => {
    const items = [
      { sharePercent: 60, locked: true },
      { sharePercent: 40, locked: false },
    ];
    const result = rebalanceShares(items, 0, 70);
    expect(result[0].sharePercent).toBe(70);
    expect(result[1].sharePercent).toBe(30);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// beToGrams
// ---------------------------------------------------------------------------

describe('beToGrams', () => {
  it('returns 0 when basis is empty', () => {
    expect(beToGrams(3, [])).toBe(0);
  });

  it('calculates correctly with single basis type', () => {
    const basis = [makeBasis({ sliceWeightG: 40, sharePercent: 100 })];
    // 3 BE × 40g = 120g
    expect(beToGrams(3, basis)).toBeCloseTo(120);
  });

  it('weights by sharePercent with two basis types', () => {
    const basis = [
      makeBasis({ sliceWeightG: 40, sharePercent: 50 }),
      makeBasis({ ingredientId: 2, name: 'Vollkorn', sliceWeightG: 60, sharePercent: 50 }),
    ];
    // avgSlice = (40×0.5 + 60×0.5) = 50g; 3 BE × 50g = 150g
    expect(beToGrams(3, basis)).toBeCloseTo(150);
  });
});

// ---------------------------------------------------------------------------
// basisKcalPerPerson
// ---------------------------------------------------------------------------

describe('basisKcalPerPerson', () => {
  it('returns 0 for empty basis', () => {
    expect(basisKcalPerPerson(3, [])).toBe(0);
  });

  it('calculates kcal correctly', () => {
    const basis = [makeBasis({ sliceWeightG: 40, energyKcal100g: 250, sharePercent: 100 })];
    // weight = 3 × 40 = 120g; kcal = 250/100 × 120 = 300
    expect(basisKcalPerPerson(3, basis)).toBeCloseTo(300);
  });

  it('skips items without energyKcal100g', () => {
    const basis = [makeBasis({ energyKcal100g: undefined, sharePercent: 100 })];
    expect(basisKcalPerPerson(3, basis)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// toppingWeightForIntensity
// ---------------------------------------------------------------------------

describe('toppingWeightForIntensity', () => {
  it('finds the correct portion by intensity name', () => {
    const topping = makeTopping();
    expect(toppingWeightForIntensity(topping, 'knapp')).toBe(10);
    expect(toppingWeightForIntensity(topping, 'normal')).toBe(15);
    expect(toppingWeightForIntensity(topping, 'üppig')).toBe(25);
  });

  it('falls back to default portion when intensity not found', () => {
    const topping = makeTopping({
      portions: [{ id: 2, name: 'Belag normal', weight_g: 15, is_default: true, quantity: 1, measuring_unit_id: 1, priority: 0 }],
    });
    expect(toppingWeightForIntensity(topping, 'knapp')).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// toppingKcalPerPerson
// ---------------------------------------------------------------------------

describe('toppingKcalPerPerson', () => {
  it('returns 0 for empty toppings', () => {
    expect(toppingKcalPerPerson(3, [], 'normal')).toBe(0);
  });

  it('calculates kcal correctly for single topping at normal intensity', () => {
    const toppings = [makeTopping({ sharePercent: 100, energyKcal100g: 740 })];
    // beForTopping = 3; weightG = 15 × 3 = 45g; kcal = 740/100 × 45 = 333
    expect(toppingKcalPerPerson(3, toppings, 'normal')).toBeCloseTo(333);
  });
});

// ---------------------------------------------------------------------------
// belagCoverageRatio / isBelagCovered
// ---------------------------------------------------------------------------

describe('belagCoverageRatio', () => {
  it('returns 1.0 when shares sum to 100', () => {
    const toppings = [
      makeTopping({ sharePercent: 60 }),
      makeTopping({ ingredientId: 3, sharePercent: 40 }),
    ];
    expect(belagCoverageRatio(toppings)).toBeCloseTo(1.0);
  });

  it('returns 0.5 when shares sum to 50', () => {
    const toppings = [makeTopping({ sharePercent: 50 })];
    expect(belagCoverageRatio(toppings)).toBeCloseTo(0.5);
  });
});

describe('isBelagCovered', () => {
  it('returns true when coverage >= 95%', () => {
    expect(isBelagCovered([makeTopping({ sharePercent: 95 })])).toBe(true);
    expect(isBelagCovered([makeTopping({ sharePercent: 100 })])).toBe(true);
  });

  it('returns false when coverage < 95%', () => {
    expect(isBelagCovered([makeTopping({ sharePercent: 80 })])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// drinkKcalFromRecipes
// ---------------------------------------------------------------------------

describe('drinkKcalFromRecipes', () => {
  it('returns 0 when no drink recipes selected', () => {
    const state = makeWizardState({ drinkRecipeIds: [] });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBe(0);
  });

  it('returns 0 when recipeDataMap has no matching entries', () => {
    const state = makeWizardState({
      drinkRecipeIds: [42],
      drinkFactors: { '42': 1.0 },
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBe(0);
  });

  it('calculates kcal from a single drink recipe with factor 1.0', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10],
      drinkFactors: { '10': 1.0 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: 120, portions: 1 }],
    ]);
    // 120 × 1.0 = 120 kcal
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(120);
  });

  it('applies factor correctly', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10],
      drinkFactors: { '10': 0.5 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: 200, portions: 1 }],
    ]);
    // 200 × 0.5 = 100 kcal
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(100);
  });

  it('sums multiple drink recipes', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10, 20],
      drinkFactors: { '10': 1.0, '20': 1.0 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: 80, portions: 1 }],
      [20, { cached_energy_kcal: 150, portions: 1 }],
    ]);
    // 80 + 150 = 230 kcal
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(230);
  });

  it('skips recipes with null cached_energy_kcal', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10, 20],
      drinkFactors: { '10': 1.0, '20': 1.0 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: null, portions: 1 }],
      [20, { cached_energy_kcal: 100, portions: 1 }],
    ]);
    // only recipe 20 contributes
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(100);
  });

  it('defaults to factor 1.0 when drinkFactors entry is missing', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10],
      drinkFactors: {}, // no factor for recipe 10
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: 60, portions: 1 }],
    ]);
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(60);
  });
});

// ---------------------------------------------------------------------------
// energyTargetKcal
// ---------------------------------------------------------------------------

describe('energyTargetKcal', () => {
  it('uses NORM_PERSON_DAILY_KCAL × factor', () => {
    expect(energyTargetKcal(0.25)).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.25);
    expect(energyTargetKcal(1.0)).toBe(NORM_PERSON_DAILY_KCAL);
  });
});

// ---------------------------------------------------------------------------
// normalizeBePerPerson
// ---------------------------------------------------------------------------

describe('normalizeBePerPerson', () => {
  it('scales BE to hit target kcal', () => {
    const state = makeWizardState({ bePerPerson: 3 });
    // target = 2335 × 0.25 = 583.75 kcal
    const newBe = normalizeBePerPerson(state, 0.25);
    // Result should be rounded to nearest 0.5 and > 0
    expect(newBe).toBeGreaterThan(0);
    expect(newBe % 0.5).toBe(0); // rounded to 0.5
  });

  it('returns current be when current total is 0', () => {
    const state = makeWizardState({
      bePerPerson: 3,
      basis: [],
      toppings: [],
    });
    expect(normalizeBePerPerson(state, 0.25)).toBe(3);
  });
});
