import { describe, it, expect } from 'vitest';
import {
  rebalanceShares,
  breadItemGrams,
  toppingItemGrams,
  toppingWeightForIntensity,
  computeGroupKcal,
  computeFatKcal,
  drinkKcalFromRecipes,
  warmDishKcalFromRecipes,
  extrasKcalPerPerson,
  extraIngredientsKcal,
  normalizeScale,
  energyTargetKcal,
  distributableKcal,
  NORM_PERSON_DAILY_KCAL,
  FAT_GRAMS_PER_PERSON,
  type RecipeEnergyData,
} from './breakfastCalc';
import type { BasisSelection, ToppingSelection, FatSelection, WizardState } from '@/schemas/breakfast';

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

function makeFat(overrides: Partial<FatSelection> = {}): FatSelection {
  return {
    ingredientId: 3,
    name: 'Butter',
    sharePercent: 50,
    locked: false,
    energyKcal100g: 717,
    pricePerKg: 15,
    portions: [
      { id: 10, name: 'Streichfett (8g)', weight_g: 8, is_default: true, quantity: 1, measuring_unit_id: 1, priority: 0 },
    ],
    ...overrides,
  };
}

function makeWizardState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    gramsPerPerson: 150,
    basis: [makeBasis()],
    fatSelections: [],
    toppings: [makeTopping()],
    globalIntensity: 'normal',
    warmDishRecipeIds: [],
    warmDishFactors: {},
    warmDishRecipeNames: {},
    extraIngredients: {},
    extraIngredientNames: {},
    drinkRecipes: [],
    drinkIngredients: [],
    ...overrides,
  };
}

// ── rebalanceShares ────────────────────────────────────────────────────────

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
    expect(result[0].sharePercent).toBe(50);
    expect(result[1].sharePercent).toBe(40);
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

// ── distributableKcal ──────────────────────────────────────────────────────

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

// ── computeGroupKcal ───────────────────────────────────────────────────────

describe('computeGroupKcal', () => {
  it('returns 0 for bread and fat, full distributable goes to topping with empty basis', () => {
    const total = distributableKcal(0.3, 0);
    const { breadKcal, fatKcal, toppingKcal } = computeGroupKcal([], [], [], 150, 0.3, 0);
    expect(breadKcal).toBe(0);
    expect(fatKcal).toBe(0);
    expect(toppingKcal).toBeCloseTo(total);
  });

  it('breadKcal is fixed from gramsPerPerson × kcal density', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const { breadKcal } = computeGroupKcal(basis, [], [], 150, 0.3, 0);
    // 150g × 250/100 = 375 kcal
    expect(breadKcal).toBeCloseTo(375);
  });

  it('toppingKcal = distributable - breadKcal - fatKcal', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const toppings = [makeTopping({ sharePercent: 100 })];
    // distributable = 2335 × 0.3 = 700.5
    // breadKcal = 150 × 250/100 = 375
    // fatKcal = 0
    // toppingKcal = 700.5 - 375 = 325.5
    const { breadKcal, toppingKcal } = computeGroupKcal(basis, toppings, [], 150, 0.3, 0);
    expect(breadKcal).toBeCloseTo(375);
    expect(toppingKcal).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3 - 375);
  });

  it('fatKcal reduces toppingKcal', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const fats = [makeFat({ sharePercent: 50, energyKcal100g: 717 })];
    // fatKcal = 50% × 8g × 717/100 = 28.68
    // toppingKcal = distributable - breadKcal - fatKcal
    const { breadKcal, fatKcal, toppingKcal } = computeGroupKcal(basis, [], fats, 150, 0.3, 0);
    expect(breadKcal).toBeCloseTo(375);
    expect(fatKcal).toBeCloseTo(0.5 * FAT_GRAMS_PER_PERSON * (717 / 100));
    expect(toppingKcal).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3 - 375 - fatKcal);
  });

  it('reserves fixKcal from distributable pool', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const { breadKcal, toppingKcal } = computeGroupKcal(basis, [], [], 150, 0.3, 100);
    // distributable = 700.5 - 100 = 600.5
    expect(toppingKcal).toBeCloseTo(600.5 - breadKcal);
  });
});

// ── computeFatKcal ─────────────────────────────────────────────────────────

describe('computeFatKcal', () => {
  it('returns 0 for empty array', () => {
    expect(computeFatKcal([])).toBe(0);
  });

  it('returns 0 for Kein Fett (ingredientId=0)', () => {
    const fats: FatSelection[] = [
      { ingredientId: 0, name: 'Kein Fett', sharePercent: 100, locked: false, energyKcal100g: 0, pricePerKg: 0, portions: [] },
    ];
    expect(computeFatKcal(fats)).toBe(0);
  });

  it('calculates kcal correctly for one fat', () => {
    const fats = [makeFat({ sharePercent: 50, energyKcal100g: 717 })];
    // 50% × 8g × 717/100 = 28.68
    expect(computeFatKcal(fats)).toBeCloseTo(0.5 * FAT_GRAMS_PER_PERSON * (717 / 100));
  });

  it('sums multiple fats', () => {
    const fats = [
      makeFat({ ingredientId: 3, sharePercent: 50, energyKcal100g: 717 }),
      makeFat({ ingredientId: 4, sharePercent: 30, energyKcal100g: 717 }),
    ];
    // 0.5 × 8 × 7.17 + 0.3 × 8 × 7.17 = 28.68 + 17.208 = 45.888
    expect(computeFatKcal(fats)).toBeCloseTo((0.5 * 8 * 7.17) + (0.3 * 8 * 7.17));
  });

  it('ignores Kein Fett (id=0) even when mixed with real fats', () => {
    const fats = [
      makeFat({ ingredientId: 3, sharePercent: 50, energyKcal100g: 717 }),
      { ingredientId: 0, name: 'Kein Fett', sharePercent: 50, locked: false, energyKcal100g: 0, pricePerKg: 0, portions: [] },
    ];
    expect(computeFatKcal(fats)).toBeCloseTo(0.5 * FAT_GRAMS_PER_PERSON * (717 / 100));
  });
});

// ── breadItemGrams ─────────────────────────────────────────────────────────

describe('breadItemGrams', () => {
  it('returns 0 for missing energyKcal100g', () => {
    expect(breadItemGrams(100, 100, 300, null)).toBe(0);
  });

  it('converts kcal to grams correctly', () => {
    expect(breadItemGrams(100, 100, 300, 250)).toBeCloseTo(120);
  });

  it('scales proportionally by share', () => {
    expect(breadItemGrams(50, 100, 300, 250)).toBeCloseTo(60);
  });
});

// ── toppingItemGrams ───────────────────────────────────────────────────────

describe('toppingItemGrams', () => {
  it('returns 0 for missing energyKcal100g', () => {
    expect(toppingItemGrams(100, 100, 300, null)).toBe(0);
  });

  it('converts kcal to grams correctly', () => {
    expect(toppingItemGrams(100, 100, 300, 740)).toBeCloseTo(300 / (740 / 100));
  });
});

// ── toppingWeightForIntensity ──────────────────────────────────────────────

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

// ── drinkKcalFromRecipes ───────────────────────────────────────────────────

describe('drinkKcalFromRecipes', () => {
  it('returns 0 when no drink recipes selected', () => {
    const state = makeWizardState({ drinkRecipes: [] });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBe(0);
  });

  it('returns 0 when no drinks have sharePercent > 0', () => {
    const state = makeWizardState({
      drinkRecipes: [{ recipeId: 42, name: 'Tea', sharePercent: 0, locked: false, energyKcal: 10 }],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBe(0);
  });

  it('calculates kcal from a single drink recipe with 100% share', () => {
    const state = makeWizardState({
      drinkRecipes: [{ recipeId: 10, name: 'Coffee', sharePercent: 100, locked: false, energyKcal: 120 }],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(120);
  });

  it('applies sharePercent correctly', () => {
    const state = makeWizardState({
      drinkRecipes: [{ recipeId: 10, name: 'Tea', sharePercent: 50, locked: false, energyKcal: 200 }],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(100);
  });

  it('sums multiple drink recipes', () => {
    const state = makeWizardState({
      drinkRecipes: [
        { recipeId: 10, name: 'Coffee', sharePercent: 50, locked: false, energyKcal: 80 },
        { recipeId: 20, name: 'Tea', sharePercent: 50, locked: false, energyKcal: 150 },
      ],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(115);
  });

  it('skips recipes with null energyKcal', () => {
    const state = makeWizardState({
      drinkRecipes: [
        { recipeId: 10, name: 'Coffee', sharePercent: 50, locked: false, energyKcal: null },
        { recipeId: 20, name: 'Tea', sharePercent: 50, locked: false, energyKcal: 100 },
      ],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(50);
  });

  it('ignores virtual "Kein Extra Getränk" option (recipeId=0)', () => {
    const state = makeWizardState({
      drinkRecipes: [
        { recipeId: 0, name: 'Kein Extra', sharePercent: 50, locked: false, energyKcal: 0 },
        { recipeId: 20, name: 'Tea', sharePercent: 50, locked: false, energyKcal: 100 },
      ],
    });
    const map = new Map<number, RecipeEnergyData>();
    expect(drinkKcalFromRecipes(state, map)).toBeCloseTo(50);
  });
});

// ── warmDishKcalFromRecipes ────────────────────────────────────────────────

describe('warmDishKcalFromRecipes', () => {
  it('returns 0 when no warm dishes', () => {
    const state = makeWizardState({ warmDishRecipeIds: [] });
    expect(warmDishKcalFromRecipes(state, new Map())).toBe(0);
  });

  it('calculates kcal from warm dish with factor', () => {
    const state = makeWizardState({ warmDishRecipeIds: [5], warmDishFactors: { '5': 2.0 } });
    const map = new Map<number, RecipeEnergyData>([[5, { cached_energy_total_kcal: 300, cached_weight_g: null, portions: 1 }]]);
    expect(warmDishKcalFromRecipes(state, map)).toBeCloseTo(600);
  });

  it('skips recipes with null kcal', () => {
    const state = makeWizardState({ warmDishRecipeIds: [5], warmDishFactors: { '5': 1.0 } });
    const map = new Map<number, RecipeEnergyData>([[5, { cached_energy_total_kcal: null, cached_weight_g: null, portions: 1 }]]);
    expect(warmDishKcalFromRecipes(state, map)).toBe(0);
  });
});

// ── extraIngredientsKcal ───────────────────────────────────────────────────

describe('extraIngredientsKcal', () => {
  it('returns 0 for empty map', () => {
    expect(extraIngredientsKcal(new Map())).toBe(0);
  });

  it('sums all values in map', () => {
    const map = new Map([[1, 50], [2, 80]]);
    expect(extraIngredientsKcal(map)).toBe(130);
  });
});

// ── extrasKcalPerPerson ────────────────────────────────────────────────────

describe('extrasKcalPerPerson', () => {
  it('returns 0 when no maps provided', () => {
    const state = makeWizardState({ warmDishRecipeIds: [5], warmDishFactors: { '5': 1.0 } });
    expect(extrasKcalPerPerson(state)).toBe(0);
  });

  it('combines warm dish kcal and extra ingredient kcal', () => {
    const state = makeWizardState({ warmDishRecipeIds: [5], warmDishFactors: { '5': 1.0 } });
    const warmMap = new Map<number, RecipeEnergyData>([[5, { cached_energy_total_kcal: 200, cached_weight_g: null, portions: 1 }]]);
    const extraMap = new Map([[1, 75]]);
    expect(extrasKcalPerPerson(state, warmMap, extraMap)).toBeCloseTo(275);
  });
});

// ── normalizeScale ─────────────────────────────────────────────────────────

describe('normalizeScale', () => {
  it('returns 1.0 for empty basis and toppings', () => {
    expect(normalizeScale([], [], [], 150, 0.3, 0)).toBe(1.0);
  });

  it('returns 1.0 when already at target', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const scale = normalizeScale(basis, [], [], 150, 0.3, 0);
    // breadKcal = 375, distributable = 700.5
    // target = 700.5 - 0 fixKcal = 700.5
    // targetTopping = 700.5 - 375 = 325.5
    // toppingKcal = 325.5 → ratio = 1.0
    expect(scale).toBeCloseTo(1.0);
  });

  it('clamps scale between 0.5 and 2.0', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const target = NORM_PERSON_DAILY_KCAL * 0.3;
    const scale = normalizeScale(basis, [], [], 150, 0.3, target * 0.99);
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(2.0);
  });
});

// ── energyTargetKcal ───────────────────────────────────────────────────────

describe('energyTargetKcal', () => {
  it('uses NORM_PERSON_DAILY_KCAL × factor', () => {
    expect(energyTargetKcal(0.3)).toBeCloseTo(NORM_PERSON_DAILY_KCAL * 0.3);
    expect(energyTargetKcal(1.0)).toBe(NORM_PERSON_DAILY_KCAL);
  });
});

// ── Integration ────────────────────────────────────────────────────────────

describe('Ampel-Coverage-Logik', () => {
  it('breadKcal + fatKcal + toppingKcal = distributable (minus fixKcal)', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const { breadKcal, toppingKcal } = computeGroupKcal(basis, [], [], 150, 0.3, 0);
    const target = distributableKcal(0.3, 0);
    expect(breadKcal + toppingKcal).toBeCloseTo(target);
  });

  it('coverage > 1.0 when fixKcal is large', () => {
    const basis = [makeBasis({ sharePercent: 100, energyKcal100g: 250 })];
    const { breadKcal } = computeGroupKcal(basis, [], [], 150, 0.3, 0);
    const target = energyTargetKcal(0.3);
    const total = breadKcal + 999;
    const coverage = target > 0 ? total / target : 0;
    expect(coverage).toBeGreaterThan(1.0);
  });
});
