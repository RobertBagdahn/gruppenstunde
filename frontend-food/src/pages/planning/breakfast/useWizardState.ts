/**
 * Wizard state hook for the Breakfast Wizard.
 * Centralises all step state and derived values.
 */
import { useState, useCallback } from 'react';
import {
  defaultWizardState,
  type WizardState,
  type BasisSelection,
  type ToppingSelection,
  type ToppingIntensity,
} from '@/schemas/breakfast';
import { rebalanceShares } from '@/lib/breakfastCalc';

export type WizardStep = 'basis' | 'belag' | 'extras' | 'getraenke' | 'cockpit';
export type UseWizardStateReturn = ReturnType<typeof useWizardState>;

export const WIZARD_STEPS: WizardStep[] = [
  'basis',
  'belag',
  'extras',
  'getraenke',
  'cockpit',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  basis: 'Basis',
  belag: 'Belag',
  extras: 'Extras',
  getraenke: 'Getränke',
  cockpit: 'Abschluss',
};

export function useWizardState(initialState?: Partial<WizardState>) {
  const [state, setState] = useState<WizardState>({
    ...defaultWizardState(),
    ...initialState,
  });
  const [step, setStep] = useState<WizardStep>('basis');

  const currentStepIndex = WIZARD_STEPS.indexOf(step);
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1;
  const canGoPrev = currentStepIndex > 0;

  const goNext = useCallback(() => {
    if (canGoNext) setStep(WIZARD_STEPS[currentStepIndex + 1]);
  }, [canGoNext, currentStepIndex]);

  const goPrev = useCallback(() => {
    if (canGoPrev) setStep(WIZARD_STEPS[currentStepIndex - 1]);
  }, [canGoPrev, currentStepIndex]);

  // ── Basis actions ──────────────────────────────────────────────────────────

  const setBePerPerson = useCallback((be: number) => {
    setState((s) => ({ ...s, bePerPerson: Math.max(1, Math.min(10, be)) }));
  }, []);

  const setBasisShare = useCallback((index: number, value: number) => {
    setState((s) => ({
      ...s,
      basis: rebalanceShares(s.basis, index, value) as BasisSelection[],
    }));
  }, []);

  const setBasisLocked = useCallback((index: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      basis: s.basis.map((b, i) => (i === index ? { ...b, locked } : b)),
    }));
  }, []);

  const initBasis = useCallback((basis: BasisSelection[]) => {
    setState((s) => ({ ...s, basis }));
  }, []);

  // ── Topping actions ────────────────────────────────────────────────────────

  const setToppingShare = useCallback((index: number, value: number) => {
    setState((s) => ({
      ...s,
      toppings: rebalanceShares(s.toppings, index, value) as ToppingSelection[],
    }));
  }, []);

  const setToppingLocked = useCallback((index: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      toppings: s.toppings.map((t, i) => (i === index ? { ...t, locked } : t)),
    }));
  }, []);

  const setGlobalIntensity = useCallback((intensity: ToppingIntensity) => {
    setState((s) => ({ ...s, globalIntensity: intensity }));
  }, []);

  const initToppings = useCallback((toppings: ToppingSelection[]) => {
    setState((s) => ({ ...s, toppings }));
  }, []);

  // ── Extras actions ─────────────────────────────────────────────────────────

  const addWarmDish = useCallback((recipeId: number, name?: string) => {
    setState((s) => ({
      ...s,
      warmDishRecipeIds: s.warmDishRecipeIds.includes(recipeId)
        ? s.warmDishRecipeIds
        : [...s.warmDishRecipeIds, recipeId],
      warmDishFactors: { ...s.warmDishFactors, [String(recipeId)]: s.warmDishFactors[String(recipeId)] ?? 1.0 },
      warmDishRecipeNames: name
        ? { ...s.warmDishRecipeNames, [String(recipeId)]: name }
        : s.warmDishRecipeNames,
    }));
  }, []);

  const removeWarmDish = useCallback((recipeId: number) => {
    setState((s) => {
      const { [String(recipeId)]: _removedFactor, ...restFactors } = s.warmDishFactors;
      const { [String(recipeId)]: _removedName, ...restNames } = s.warmDishRecipeNames;
      return {
        ...s,
        warmDishRecipeIds: s.warmDishRecipeIds.filter((id) => id !== recipeId),
        warmDishFactors: restFactors,
        warmDishRecipeNames: restNames,
      };
    });
  }, []);

  const setWarmDishFactor = useCallback((recipeId: number, factor: number) => {
    setState((s) => ({
      ...s,
      warmDishFactors: { ...s.warmDishFactors, [String(recipeId)]: factor },
    }));
  }, []);

  const setExtraIngredient = useCallback((ingredientId: number, gramsPerPerson: number, name?: string) => {
    setState((s) => ({
      ...s,
      extraIngredients: { ...s.extraIngredients, [String(ingredientId)]: gramsPerPerson },
      extraIngredientNames: name
        ? { ...s.extraIngredientNames, [String(ingredientId)]: name }
        : s.extraIngredientNames,
    }));
  }, []);

  const removeExtraIngredient = useCallback((ingredientId: number) => {
    setState((s) => {
      const { [String(ingredientId)]: _removed, ...rest } = s.extraIngredients;
      return { ...s, extraIngredients: rest };
    });
  }, []);

  // ── Drinks actions ─────────────────────────────────────────────────────────

  const addDrinkRecipe = useCallback((recipeId: number, name?: string) => {
    setState((s) => ({
      ...s,
      drinkRecipeIds: s.drinkRecipeIds.includes(recipeId)
        ? s.drinkRecipeIds
        : [...s.drinkRecipeIds, recipeId],
      drinkFactors: { ...s.drinkFactors, [String(recipeId)]: s.drinkFactors[String(recipeId)] ?? 1.0 },
      drinkRecipeNames: name
        ? { ...s.drinkRecipeNames, [String(recipeId)]: name }
        : s.drinkRecipeNames,
    }));
  }, []);

  const removeDrinkRecipe = useCallback((recipeId: number) => {
    setState((s) => {
      const { [String(recipeId)]: _f, ...restFactors } = s.drinkFactors;
      const { [String(recipeId)]: _n, ...restNames } = s.drinkRecipeNames;
      return {
        ...s,
        drinkRecipeIds: s.drinkRecipeIds.filter((id) => id !== recipeId),
        drinkFactors: restFactors,
        drinkRecipeNames: restNames,
      };
    });
  }, []);

  const setDrinkFactor = useCallback((recipeId: number, factor: number) => {
    setState((s) => ({
      ...s,
      drinkFactors: { ...s.drinkFactors, [String(recipeId)]: factor },
    }));
  }, []);

  // ── Full state replace (for normalise / state-restore) ─────────────────────

  const replaceState = useCallback((next: WizardState) => {
    setState(next);
  }, []);

  return {
    state,
    step,
    setStep,
    currentStepIndex,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    // actions
    setBePerPerson,
    setBasisShare,
    setBasisLocked,
    initBasis,
    setToppingShare,
    setToppingLocked,
    setGlobalIntensity,
    initToppings,
    addWarmDish,
    removeWarmDish,
    setWarmDishFactor,
    setExtraIngredient,
    removeExtraIngredient,
    addDrinkRecipe,
    removeDrinkRecipe,
    setDrinkFactor,
    replaceState,
  };
}
