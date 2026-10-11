import { describe, expect, it } from 'vitest';
import type { BreakfastCatalog, WizardItemIn, WizardState } from '@/schemas/breakfast';
import { defaultWizardState } from '@/schemas/breakfast';
import type { MealItem } from '@/schemas/mealPlan';
import { BREAKFAST_PROFILES, buildBreakfastProfileState } from './breakfastProfiles';
import { buildBreakfastWizardItems } from './breakfastWizardItems';
import { refMealItemsToWizardState } from './refMealToWizardState';

const DAY_PART_FACTOR = 0.25;
const NORM_PORTIONS = 10;

function ingredient(id: number, name: string, energyKcal: number | null) {
  return { id, name, slug: name.toLowerCase(), is_standalone_food: true, energy_kcal: energyKcal, price_per_kg: null, portions: [] };
}

// Catalog with unusable first entries (missing or zero kcal) in every group.
const catalog: BreakfastCatalog = {
  base_ingredients: [
    { ...ingredient(1, 'Baguette', 0), standard_recipe_weight_g: 50 },
    { ...ingredient(2, 'Vollkornbrot', 220), standard_recipe_weight_g: 50 },
    { ...ingredient(3, 'Cornflakes', null), standard_recipe_weight_g: null },
    { ...ingredient(4, 'Haferflocken', 370), standard_recipe_weight_g: null },
  ],
  topping_ingredients: [
    ingredient(10, 'Emmentaler', null),
    ingredient(11, 'Gouda', 350),
    ingredient(12, 'Honig', 304),
    ingredient(13, 'Salami', 400),
    ingredient(14, 'Erdnussbutter', 600),
  ],
  fat_ingredients: [
    ingredient(20, 'Butter', 717),
    ingredient(21, 'Pflanzenmargarine', 540),
  ],
  extra_ingredients: [
    ingredient(30, 'Apfel', 52),
    ingredient(31, 'Banane', 89),
    ingredient(32, 'Tomate', 18),
  ],
  drink_ingredients: [
    ingredient(40, 'Milch', 64),
    ingredient(41, 'Haferdrink', 45),
    ingredient(42, 'Orangensaft', 45),
  ],
  drink_recipes: [
    { id: 50, title: 'Kakao', recipe_type: 'drink', cached_energy_total_kcal: 800, cached_weight_g: 2000 },
    { id: 51, title: 'Früchtetee', recipe_type: 'drink', cached_energy_total_kcal: 0, cached_weight_g: 2000 },
  ],
  warm_meal_recipes: [],
  gram_measuring_unit_id: 100,
  ml_measuring_unit_id: 101,
  scheibe_measuring_unit_id: null,
  portion_measuring_unit_id: null,
  tasse_measuring_unit_id: null,
  schuss_measuring_unit_id: null,
};

const FAT_IDS = catalog.fat_ingredients.map((item) => item.id);
const TOPPING_IDS = catalog.topping_ingredients.map((item) => item.id);

/** Tags the backend would expose for a saved ingredient, derived from catalog membership. */
function catalogTags(ingredientId: number): string[] {
  if (catalog.base_ingredients.some((item) => item.id === ingredientId)) return ['buffet-bread'];
  if (FAT_IDS.includes(ingredientId)) return ['buffet-fat'];
  if (TOPPING_IDS.includes(ingredientId)) return ['buffet-cheese'];
  if (catalog.extra_ingredients.some((item) => item.id === ingredientId)) return ['buffet-fresh'];
  if (catalog.drink_ingredients.some((item) => item.id === ingredientId)) return ['buffet-drink'];
  return [];
}

/** Simulates the saved MealItems the direct breakfast endpoint returns for wizard items. */
function savedMealItems(items: WizardItemIn[], portionWeights: Record<number, number> = {}): MealItem[] {
  return items.map((item, index) => {
    const quantity = item.quantity ?? null;
    const portionWeight = item.portion_id != null ? portionWeights[item.portion_id] ?? null : 1;
    return {
      id: index + 1,
      recipe_id: item.recipe_id ?? null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: item.recipe_id != null ? 'drink' : '',
      image_url: null,
      ingredient_id: item.ingredient_id ?? null,
      ingredient_name: item.ingredient_id != null ? `Zutat ${item.ingredient_id}` : '',
      ingredient_slug: '',
      quantity,
      measuring_unit_id: item.measuring_unit_id ?? null,
      measuring_unit_name: item.portion_id != null ? 'Esslöffel' : 'Gramm',
      portion_id: item.portion_id ?? null,
      portion_name: item.portion_id != null ? 'EL' : '',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'g',
      is_weight_approx: false,
      display_name: null,
      note: '',
      factor: item.factor ?? 1,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: null,
      cost_eur: null,
      quantity_g: quantity != null && portionWeight != null ? quantity * portionWeight : null,
      ingredient_tags: item.ingredient_id != null ? catalogTags(item.ingredient_id) : [],
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: true,
      warnings: [],
    } satisfies MealItem;
  });
}

function reopen(items: WizardItemIn[], portionWeights?: Record<number, number>): WizardState {
  return {
    ...defaultWizardState(),
    ...refMealItemsToWizardState(savedMealItems(items, portionWeights), catalog, NORM_PORTIONS),
  };
}

function sortedItems(items: WizardItemIn[]): WizardItemIn[] {
  return [...items].sort((a, b) =>
    (a.ingredient_id ?? 0) - (b.ingredient_id ?? 0) || (a.recipe_id ?? 0) - (b.recipe_id ?? 0));
}

function savedIds(items: WizardItemIn[]): number[] {
  return items.flatMap((item) => (item.ingredient_id != null ? [item.ingredient_id] : []));
}

function savedRecipeIds(items: WizardItemIn[]): number[] {
  return items.flatMap((item) => (item.recipe_id != null ? [item.recipe_id] : []));
}

describe('buildBreakfastProfileState', () => {
  it.each(BREAKFAST_PROFILES.map((profile) => profile.id))('round-trips profile %s through save and reopen', (profile) => {
    const { state } = buildBreakfastProfileState(profile, catalog, defaultWizardState());
    const items = buildBreakfastWizardItems(state, catalog, DAY_PART_FACTOR);
    const restored = reopen(items);

    expect(sortedItems(buildBreakfastWizardItems(restored, catalog, DAY_PART_FACTOR))).toEqual(sortedItems(items));
    // Restored groups are explicit, so the steps do not refill catalog defaults.
    expect(restored.fatSelections.length).toBeGreaterThan(0);
    expect(restored.toppings.length).toBeGreaterThan(0);
    expect(restored.drinkRecipes.length).toBeGreaterThan(0);
  });

  it('saves Nur Müsli with a usable cereal base and no fat or topping', () => {
    const { state, hints } = buildBreakfastProfileState('muesli', catalog, defaultWizardState());
    const items = buildBreakfastWizardItems(state, catalog, DAY_PART_FACTOR);
    const ids = savedIds(items);

    expect(hints).toEqual([]);
    expect(items).toContainEqual({ ingredient_id: 4, quantity: 80, measuring_unit_id: 100, factor: 1 });
    expect(ids).not.toContain(3);
    expect(ids.filter((id) => FAT_IDS.includes(id))).toEqual([]);
    expect(ids.filter((id) => TOPPING_IDS.includes(id))).toEqual([]);
    expect(state.fatSelections.find((fat) => fat.name === 'Kein Fett')?.sharePercent).toBe(100);
    expect(state.toppings.every((topping) => topping.sharePercent === 0)).toBe(true);
  });

  it('skips catalog items without kcal and picks the first usable one', () => {
    const { state, hints } = buildBreakfastProfileState('vegetarian', catalog, defaultWizardState());
    const items = buildBreakfastWizardItems(state, catalog, DAY_PART_FACTOR);
    const ids = savedIds(items);

    expect(hints).toEqual([]);
    expect(state.basis.find((base) => base.sharePercent > 0)?.name).toBe('Vollkornbrot');
    expect(state.toppings.find((topping) => topping.sharePercent > 0)?.name).toBe('Gouda');
    expect(ids).toContain(2);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(10);
    expect(ids).not.toContain(13);
  });

  it('fills Brot vegetarisch with cheese and a sweet spread as described', () => {
    const description = BREAKFAST_PROFILES.find((profile) => profile.id === 'vegetarian')?.description;
    // Erdnussbutter comes first, but the sweet spread (Honig) is preferred next to the cheese.
    const catalogWithSpreadFirst: BreakfastCatalog = {
      ...catalog,
      topping_ingredients: [ingredient(14, 'Erdnussbutter', 600), ...catalog.topping_ingredients.filter((item) => item.id !== 14)],
    };
    const { state, hints } = buildBreakfastProfileState('vegetarian', catalogWithSpreadFirst, defaultWizardState());
    const items = buildBreakfastWizardItems(state, catalogWithSpreadFirst, DAY_PART_FACTOR);

    expect(description).toContain('Käse');
    expect(hints).toEqual([]);
    expect(state.toppings.filter((topping) => topping.sharePercent > 0).map(({ name, sharePercent }) => `${name}:${sharePercent}`))
      .toEqual(['Gouda:50', 'Honig:50']);
    expect(savedIds(items)).toEqual(expect.arrayContaining([11, 12]));
    expect(savedIds(items)).not.toContain(14);
  });

  it('hints when Brot vegetarisch finds no cheese with kcal', () => {
    const catalogWithoutCheese: BreakfastCatalog = {
      ...catalog,
      topping_ingredients: catalog.topping_ingredients.filter((item) => item.id !== 11),
    };
    const { state, hints } = buildBreakfastProfileState('vegetarian', catalogWithoutCheese, defaultWizardState());

    expect(hints).toEqual(['Kein Käse mit kcal-Angabe gefunden. Der Belag enthält nur Aufstrich.']);
    expect(state.toppings.filter((topping) => topping.sharePercent > 0).map(({ name, sharePercent }) => `${name}:${sharePercent}`))
      .toEqual(['Honig:100']);
  });

  it('starts profiles with fat at 50 % plus "Kein Fett" at 50 %', () => {
    const { state } = buildBreakfastProfileState('meat', catalog, defaultWizardState());

    expect(state.fatSelections.map(({ name, sharePercent }) => `${name}:${sharePercent}`)).toEqual([
      'Butter:50',
      'Pflanzenmargarine:0',
      'Kein Fett:50',
    ]);
  });

  it('keeps animal products, milk and cocoa out of Brot pflanzlich', () => {
    const { state } = buildBreakfastProfileState('plant', catalog, defaultWizardState());
    const items = buildBreakfastWizardItems(state, catalog, DAY_PART_FACTOR);

    expect(savedIds(items)).toEqual(expect.arrayContaining([2, 14, 21, 41]));
    expect(savedIds(items)).not.toEqual(expect.arrayContaining([20]));
    for (const excludedId of [11, 12, 13, 20, 40]) {
      expect(savedIds(items)).not.toContain(excludedId);
    }
    expect(savedRecipeIds(items)).toEqual([51]);
  });

  it('returns a German hint instead of selecting a base without kcal', () => {
    const catalogWithoutUsableCereal: BreakfastCatalog = {
      ...catalog,
      base_ingredients: catalog.base_ingredients.map((item) => (item.id === 4 ? { ...item, energy_kcal: 0 } : item)),
    };

    const { state, hints } = buildBreakfastProfileState('muesli', catalogWithoutUsableCereal, defaultWizardState());

    expect(hints).toEqual([
      'Kein Müsli und keine Haferflocken mit kcal-Angabe gefunden. Ergänze die Nährwerte oder wähle eine andere Basis.',
    ]);
    expect(state.basis.every((base) => base.sharePercent === 0)).toBe(true);
    expect(savedIds(buildBreakfastWizardItems(state, catalogWithoutUsableCereal, DAY_PART_FACTOR))
      .filter((id) => id <= 4)).toEqual([]);
  });
});

describe('free breakfast extras', () => {
  it('keeps the chosen portion and amount and survives reopening', () => {
    const { state } = buildBreakfastProfileState('vegetarian', catalog, defaultWizardState());
    const withFreeExtra: WizardState = {
      ...state,
      extraIngredients: { ...state.extraIngredients, '99': 30 },
      extraIngredientNames: { ...state.extraIngredientNames, '99': 'Tomatenmark' },
      extraIngredientSelections: {
        '99': { portionId: 501, measuringUnitId: 12, portionName: 'EL', measuringUnitName: 'Esslöffel', quantity: 2, weightG: 15 },
      },
    };

    const items = buildBreakfastWizardItems(withFreeExtra, catalog, DAY_PART_FACTOR);
    expect(items).toContainEqual({ ingredient_id: 99, quantity: 2, measuring_unit_id: 12, portion_id: 501, factor: 1 });

    const restored = reopen(items, { 501: 15 });
    expect(restored.extraIngredients['99']).toBe(30);
    expect(restored.extraIngredientSelections['99']).toMatchObject({ portionId: 501, quantity: 2, weightG: 15, portionName: 'EL' });
    expect(sortedItems(buildBreakfastWizardItems(restored, catalog, DAY_PART_FACTOR))).toEqual(sortedItems(items));
  });
});
