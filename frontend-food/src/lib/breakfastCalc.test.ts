import { describe, it, expect } from 'vitest';
import {
  rebalanceShares,
  breadItemGrams,
  toppingItemGrams,
  toppingWeightForIntensity,
  computeGroupKcal,
  drinkKcalFromRecipes,
  warmDishKcalFromRecipes,
  extrasKcalPerPerson,
  extraIngredientsKcal,
  normalizeScale,
  energyTargetKcal,
  distributableKcal,
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
    gramsPerPerson: 150,
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
// Task 11.2: rebalanceShares — Largest Remainder Method
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
    const items = [
      { sharePercent: 33, locked: false },
      { sharePercent: 33, locked: false },
      { sharePercent: 34, locked: false },
    ];
    const result = rebalanceShares(items, 0, 1);
    const sum = result.reduce((s, item) => s + item.sharePercent, 0);
    expect(sum).toBe(100);
    expect(result[0].sharePercent).toBe(1);
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

  it('handles 2 items: [99, 1] sums to 100', () => {
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
});

// ---------------------------------------------------------------------------
// Task 11.2: Gramm-basierte Berechnungsfunktionen
// ---------------------------------------------------------------------------

describe('distributableKcal', () => {
  it('returns NORM × factor when fixKcal=0', () => {
    expect(distributableKcal(0.3, 0)).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3);
  });

  it('subtracts fixKcal from available kcal', () => {
    const target = NORM_PERSON_DAILY_KCAL * 0.3;
    expect(distributableKcal(0.3, 100)).toBeCloseTo(target - 100);
  });

  it('never returns negative', () => {
    expect(distributableKcal(0.1, 9999)).toBe(0);
  });
});

describe('computeGroupKcal', () => {
  it('splits evenly between equal basis and topping shares', () => {
    const basis = [makeBasis({ sharePercent: 50 })];
    const toppings = [makeTopping({ sharePercent: 50 })];
    const { breadKcal, toppingKcal } = computeGroupKcal(basis, toppings, 0.3, 0);
    expect(breadKcal).toBeCloseTo(toppingKcal);
    expect(breadKcal + toppingKcal).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3);
  });

  it('returns 0 for empty basis and toppings', () => {
    const { breadKcal, toppingKcal } = computeGroupKcal([], [], 0.3, 0);
    expect(breadKcal).toBe(0);
    expect(toppingKcal).toBe(0);
  });

  it('reserves fixKcal from distributable pool', () => {
    const basis = [makeBasis({ sharePercent: 100 })];
    const { breadKcal } = computeGroupKcal(basis, [], 0.3, 100);
    const expected = NORM_PERSON_DAILY_KCAL * 0.3 - 100;
    expect(breadKcal).toBeCloseTo(expected);
  });
});

describe('breadItemGrams', () => {
  it('returns 0 for missing energyKcal100g', () => {
    expect(breadItemGrams(100, 100, 300, null)).toBe(0);
  });

  it('converts kcal to grams correctly', () => {
    // 300 kcal / (250/100) = 120g
    expect(breadItemGrams(100, 100, 300, 250)).toBeCloseTo(120);
  });

  it('scales proportionally by share', () => {
    // 50% of 300 kcal = 150 kcal → 150/(250/100) = 60g
    expect(breadItemGrams(50, 100, 300, 250)).toBeCloseTo(60);
  });
});

describe('toppingItemGrams', () => {
  it('returns 0 for missing energyKcal100g', () => {
    expect(toppingItemGrams(100, 100, 300, null)).toBe(0);
  });

  it('converts kcal to grams correctly', () => {
    // 300 kcal / (740/100) ≈ 40.54g
    expect(toppingItemGrams(100, 100, 300, 740)).toBeCloseTo(300 / (740 / 100));
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
// Task 11.2: drinkKcalFromRecipes
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
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(100);
  });

  it('defaults to factor 1.0 when drinkFactors entry is missing', () => {
    const state = makeWizardState({
      drinkRecipeIds: [10],
      drinkFactors: {},
    });
    const map = new Map<number, RecipeEnergyData>([
      [10, { cached_energy_kcal: 60, portions: 1 }],
    ]);
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(60);
  });
});

// ---------------------------------------------------------------------------
// Task 11.7: Extras-Kcal (warme Gerichte + Extra-Zutaten)
// ---------------------------------------------------------------------------

describe('warmDishKcalFromRecipes', () => {
  it('returns 0 when no warm dishes', () => {
    const state = makeWizardState({ warmDishRecipeIds: [] });
    expect(warmDishKcalFromRecipes(state, new Map())).toBe(0);
  });

  it('calculates kcal from warm dish with factor', () => {
    const state = makeWizardState({
      warmDishRecipeIds: [5],
      warmDishFactors: { '5': 2.0 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [5, { cached_energy_kcal: 300, portions: 1 }],
    ]);
    // 300 × 2.0 = 600
    expect(warmDishKcalFromRecipes(state, map)).toBeCloseTo(600);
  });

  it('skips recipes with null kcal', () => {
    const state = makeWizardState({
      warmDishRecipeIds: [5],
      warmDishFactors: { '5': 1.0 },
    });
    const map = new Map<number, RecipeEnergyData>([
      [5, { cached_energy_kcal: null, portions: 1 }],
    ]);
    expect(warmDishKcalFromRecipes(state, map)).toBe(0);
  });
});

describe('extraIngredientsKcal', () => {
  it('returns 0 for empty map', () => {
    expect(extraIngredientsKcal(new Map())).toBe(0);
  });

  it('sums all values in map', () => {
    const map = new Map([[1, 50], [2, 80]]);
    expect(extraIngredientsKcal(map)).toBe(130);
  });
});

describe('extrasKcalPerPerson', () => {
  it('returns 0 when no maps provided', () => {
    const state = makeWizardState({
      warmDishRecipeIds: [5],
      warmDishFactors: { '5': 1.0 },
    });
    expect(extrasKcalPerPerson(state)).toBe(0);
  });

  it('combines warm dish kcal and extra ingredient kcal', () => {
    const state = makeWizardState({
      warmDishRecipeIds: [5],
      warmDishFactors: { '5': 1.0 },
    });
    const warmMap = new Map<number, RecipeEnergyData>([[5, { cached_energy_kcal: 200, portions: 1 }]]);
    const extraMap = new Map([[1, 75]]);
    expect(extrasKcalPerPerson(state, warmMap, extraMap)).toBeCloseTo(275);
  });
});

// ---------------------------------------------------------------------------
// Task 11.4: Normalisieren skaliert Brot+Belag korrekt
// ---------------------------------------------------------------------------

describe('normalizeScale', () => {
  it('returns 1.0 for empty basis and toppings', () => {
    expect(normalizeScale([], [], 0.3, 0)).toBe(1.0);
  });

  it('returns scale factor to hit kcal target', () => {
    // basis contributes 100% shares; 300 kcal target; current total = ?
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    // Without fixKcal, breadKcal = NORM * 0.3 = 700.5 already at target → scale = 1
    const scale = normalizeScale(basis, [], 0.3, 0);
    expect(scale).toBeCloseTo(1.0);
  });

  it('clamps scale between 0.5 and 2.0', () => {
    // Scenario: tiny target vs large current → clamp to 0.5
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    // fixKcal near the full target → scale very small → clamped
    const target = NORM_PERSON_DAILY_KCAL * 0.3;
    const scale = normalizeScale(basis, [], 0.3, target * 0.99);
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(2.0);
  });
});

// ---------------------------------------------------------------------------
// energyTargetKcal
// ---------------------------------------------------------------------------

describe('energyTargetKcal', () => {
  it('uses NORM_PERSON_DAILY_KCAL × factor', () => {
    expect(energyTargetKcal(0.3)).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3);
    expect(energyTargetKcal(1.0)).toBe(NORM_PERSON_DAILY_KCAL);
  });
});

// ---------------------------------------------------------------------------
// Task 11.5+11.6: Ampel-Coverage (Integration)
// ---------------------------------------------------------------------------

describe('Ampel-Coverage-Logik', () => {
  it('breadKcal + toppingKcal matches distributable kcal', () => {
    const basis = [makeBasis({ sharePercent: 60 })];
    const toppings = [makeTopping({ sharePercent: 40 })];
    const { breadKcal, toppingKcal } = computeGroupKcal(basis, toppings, 0.3, 0);
    const target = distributableKcal(0.3, 0);
    expect(breadKcal + toppingKcal).toBeCloseTo(target);
  });

  it('coverage > 1.0 when fixKcal is large', () => {
    // Extra kcal pushes total above target
    const basis = [makeBasis({ sharePercent: 100 })];
    const { breadKcal } = computeGroupKcal(basis, [], 0.3, 0);
    const target = energyTargetKcal(0.3);
    // total = breadKcal + 999 fixKcal should be >> target
    const total = breadKcal + 999;
    const coverage = target > 0 ? total / target : 0;
    expect(coverage).toBeGreaterThan(1.0);
  });
});
