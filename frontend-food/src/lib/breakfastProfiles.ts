/**
 * Breakfast profiles: client-side presets that fill the whole wizard state.
 *
 * A profile only preselects catalog items that can actually be saved: basis,
 * spread and topping items need a kcal value, otherwise the wizard would save
 * 0 g for them (and hand their kcal budget to the next group). If a group has
 * no usable item, the profile leaves it unselected and returns a hint.
 */
import type {
  BaseIngredient,
  BreakfastCatalog,
  BreakfastProfileSlug,
  WizardState,
} from '@/schemas/breakfast';
import {
  DEFAULT_FIRST_FAT_SHARE_PERCENT,
  fatSelectionsWithNoFat,
  noExtraDrinkSelection,
  toppingSelectionFromCatalog,
} from '@/lib/breakfastWizardItems';

export const BREAKFAST_PROFILES: Array<{ id: BreakfastProfileSlug; title: string; description: string }> = [
  { id: 'muesli', title: 'Nur Müsli', description: 'Müsli oder Haferflocken mit Obst und Getränken' },
  { id: 'bread-muesli', title: 'Brot und Müsli', description: 'Brot, Müsli, Belag, Obst und Getränke' },
  { id: 'plant', title: 'Brot pflanzlich', description: 'Pflanzliche Aufstriche, Obst und Getränke' },
  { id: 'vegetarian', title: 'Brot vegetarisch', description: 'Käse, vegetarische Aufstriche, Obst und Getränke' },
  { id: 'meat', title: 'Brot mit Fleisch', description: 'Herzhafter Belag, Käse, Obst und Getränke' },
];

const CEREAL_TERMS = ['müsli', 'haferflock', 'cornflake'];
const MEAT_TERMS = ['leberwurst', 'salami', 'schinken', 'putenbrust', 'thunfisch'];
const ANIMAL_PRODUCT_TERMS = ['käse', 'edamer', 'gouda', 'emmentaler', 'frischkäse', 'honig'];
const PROFILE_EXTRA_FRUIT_TERMS = ['apfel', 'banane', 'erdbeere', 'orange', 'beere'];

function nameMatches(name: string, terms: string[]): boolean {
  const normalized = name.toLocaleLowerCase('de-DE');
  return terms.some((term) => normalized.includes(term));
}

function hasUsableKcal(item: { energy_kcal: number | null }): boolean {
  return item.energy_kcal != null && item.energy_kcal > 0;
}

export interface BreakfastProfileState {
  state: WizardState;
  /** German hints for groups the profile could not fill with usable items. */
  hints: string[];
}

export function buildBreakfastProfileState(
  profile: BreakfastProfileSlug,
  catalog: BreakfastCatalog,
  currentState: WizardState,
): BreakfastProfileState {
  const isMuesliOnly = profile === 'muesli';
  const isBreadAndMuesli = profile === 'bread-muesli';
  const isPlant = profile === 'plant';
  const isVegetarian = profile === 'vegetarian' || isPlant;
  const isMeat = profile === 'meat';
  const hints: string[] = [];

  // ── Basis ──
  const isCereal = (item: BaseIngredient) => nameMatches(item.name, CEREAL_TERMS);
  const breads = catalog.base_ingredients.filter((item) => !isCereal(item));
  const cereals = catalog.base_ingredients.filter(isCereal);
  const firstUsableBread = breads.find(hasUsableKcal);
  const firstUsableCereal = cereals.find(hasUsableKcal);
  const baseCandidates = isMuesliOnly ? cereals : isBreadAndMuesli ? [...breads, ...cereals] : breads;
  const baseShares = new Map<number, number>();
  if (isMuesliOnly) {
    if (firstUsableCereal) baseShares.set(firstUsableCereal.id, 100);
    else hints.push('Kein Müsli und keine Haferflocken mit kcal-Angabe gefunden. Ergänze die Nährwerte oder wähle eine andere Basis.');
  } else if (isBreadAndMuesli) {
    if (firstUsableBread && firstUsableCereal) {
      baseShares.set(firstUsableBread.id, 60);
      baseShares.set(firstUsableCereal.id, 40);
    } else if (firstUsableBread || firstUsableCereal) {
      const onlyBase = firstUsableBread ?? firstUsableCereal;
      if (onlyBase) baseShares.set(onlyBase.id, 100);
      hints.push(firstUsableBread
        ? 'Kein Müsli und keine Haferflocken mit kcal-Angabe gefunden. Die Basis enthält nur Brot.'
        : 'Kein Brot mit kcal-Angabe gefunden. Die Basis enthält nur Müsli.');
    } else {
      hints.push('Keine Basis-Zutat mit kcal-Angabe gefunden. Ergänze die Nährwerte oder wähle eine andere Basis.');
    }
  } else if (firstUsableBread) {
    baseShares.set(firstUsableBread.id, 100);
  } else {
    hints.push('Kein Brot mit kcal-Angabe gefunden. Ergänze die Nährwerte oder wähle eine andere Basis.');
  }
  // Bread-and-muesli shows only its chosen bases; other profiles list all candidates for editing.
  // Without any usable base, all bases stay at 0 % so the user picks one explicitly.
  const bases = baseShares.size === 0
    ? (baseCandidates.length > 0 ? baseCandidates : catalog.base_ingredients)
    : isBreadAndMuesli
      ? baseCandidates.filter((item) => baseShares.has(item.id))
      : baseCandidates;

  // ── Belag ──
  const toppings = isMuesliOnly
    ? catalog.topping_ingredients
    : catalog.topping_ingredients.filter((item) => {
        if (isPlant && nameMatches(item.name, [...ANIMAL_PRODUCT_TERMS, ...MEAT_TERMS])) return false;
        if (isVegetarian && nameMatches(item.name, MEAT_TERMS)) return false;
        if (isMeat) return nameMatches(item.name, [...MEAT_TERMS, 'gouda', 'käse', 'frischkäse']);
        return true;
      });
  // "Nur Müsli" lists all toppings at 0 %: explicitly no topping, but still selectable.
  const activeTopping = isMuesliOnly ? undefined : toppings.find(hasUsableKcal);
  if (!isMuesliOnly && !activeTopping) {
    hints.push('Kein passender Belag mit kcal-Angabe gefunden. Der Belag bleibt leer.');
  }
  // Without a matching topping, all toppings stay listed at 0 % so the step does not refill defaults.
  const toppingOptions = toppings.length > 0 ? toppings : catalog.topping_ingredients;

  // ── Streichfett ──
  const fats = isPlant
    ? catalog.fat_ingredients.filter((item) => nameMatches(item.name, ['margarine', 'pflanz']))
    : catalog.fat_ingredients;
  const activeFat = isMuesliOnly ? undefined : fats.find(hasUsableKcal);
  if (!isMuesliOnly && !activeFat && fats.length > 0) {
    hints.push('Kein passendes Streichfett mit kcal-Angabe gefunden. Es wird kein Fett eingeplant.');
  }

  // ── Getränke ──
  const drinks = catalog.drink_recipes.filter((item) => !isPlant || !nameMatches(item.title, ['milch', 'kakao']));
  const drinkIngredients = catalog.drink_ingredients.filter((item) =>
    isPlant
      ? nameMatches(item.name, ['hafer', 'soja', 'mandel', 'pflanz'])
      : isMuesliOnly || isBreadAndMuesli
        ? nameMatches(item.name, ['milch'])
        : nameMatches(item.name, ['saft', 'milch']),
  ).slice(0, 1);

  // ── Extras ──
  const extras = catalog.extra_ingredients
    .filter((item) => (isMuesliOnly || isBreadAndMuesli ? nameMatches(item.name, PROFILE_EXTRA_FRUIT_TERMS) : true))
    .slice(0, isMuesliOnly || isBreadAndMuesli ? 2 : 1);

  const state: WizardState = {
    ...currentState,
    gramsPerPerson: isMuesliOnly ? 80 : isBreadAndMuesli ? 120 : 150,
    basis: bases.map((item) => ({
      ingredientId: item.id,
      name: item.name,
      sharePercent: baseShares.get(item.id) ?? 0,
      locked: false,
      sliceWeightG: item.standard_recipe_weight_g ?? 50,
      energyKcal100g: item.energy_kcal,
    })),
    toppings: toppingOptions.map((item) => toppingSelectionFromCatalog(item, item.id === activeTopping?.id ? 100 : 0)),
    fatSelections: fatSelectionsWithNoFat(fats, activeFat?.id ?? null, DEFAULT_FIRST_FAT_SHARE_PERCENT),
    drinkRecipes: [
      ...drinks.map((item, index) => ({ recipeId: item.id, name: item.title, sharePercent: index === 0 ? 100 : 0, locked: false, energyKcal: item.cached_energy_total_kcal })),
      noExtraDrinkSelection(drinks.length > 0 ? 0 : 100),
    ],
    drinkIngredients: drinkIngredients.map((item, index) => ({ ingredientId: item.id, name: item.name, sharePercent: index === 0 ? 100 : 0, locked: false, mlPerPerson: 200 })),
    extraIngredients: Object.fromEntries(extras.map((item) => [String(item.id), 80])),
    extraIngredientNames: Object.fromEntries(extras.map((item) => [String(item.id), item.name])),
    extraIngredientSelections: {},
    warmDishRecipeIds: [],
    warmDishFactors: {},
    warmDishRecipeNames: {},
    globalIntensity: 'normal',
  };
  return { state, hints };
}
