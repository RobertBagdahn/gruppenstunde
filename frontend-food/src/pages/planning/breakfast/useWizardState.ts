/**
 * Wizard state hook for the Breakfast Wizard.
 * Centralises all step state and derived values.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  defaultWizardState,
  type WizardState,
  type BasisSelection,
  type ToppingSelection,
  type FatSelection,
  type DrinkRecipeSelection,
  type DrinkIngredientSelection,
  type ToppingIntensity,
} from '@/schemas/breakfast';
import { rebalanceShares } from '@/lib/breakfastCalc';

export type WizardStep = 'basis' | 'fett' | 'belag' | 'extras' | 'getraenke' | 'cockpit';
export type UseWizardStateReturn = ReturnType<typeof useWizardState>;

export const WIZARD_STEPS: WizardStep[] = [
  'basis',
  'fett',
  'belag',
  'extras',
  'getraenke',
  'cockpit',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  basis: 'Basis',
  fett: 'Streichfett',
  belag: 'Belag',
  extras: 'Extras',
  getraenke: 'Getränke',
  cockpit: 'Abschluss',
};

export type CreateModalType = 'ingredient' | 'recipe' | null;

export interface CreateModalState {
  isOpen: boolean;
  type: CreateModalType;
  breakfastTag?: string; // breakfast-base, breakfast-fat, breakfast-topping, breakfast-extra, etc.
  recipeType?: string; // 'breakfast', 'drink', etc.
  isSubmitting: boolean;
  error: string | null;
}

export function useWizardState(initialState?: Partial<WizardState>) {
  const [state, setState] = useState<WizardState>({
    ...defaultWizardState(),
    ...initialState,
  });
  const [step, setStep] = useState<WizardStep>('basis');

  useEffect(() => {
    if (initialState) {
      setState((current) => ({ ...current, ...initialState }));
    }
  }, [initialState]);

  // ── Modal state for create ingredient/recipe ──────────────────────────────
  const [createModal, setCreateModal] = useState<CreateModalState>({
    isOpen: false,
    type: null,
    isSubmitting: false,
    error: null,
  });

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

  // ── Fat actions ────────────────────────────────────────────────────────────

  const setFatShare = useCallback((index: number, value: number) => {
    setState((s) => ({
      ...s,
      fatSelections: rebalanceShares(s.fatSelections, index, value) as FatSelection[],
    }));
  }, []);

  const setFatLocked = useCallback((index: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      fatSelections: s.fatSelections.map((f, i) => (i === index ? { ...f, locked } : f)),
    }));
  }, []);

  const initFats = useCallback((fats: FatSelection[]) => {
    setState((s) => ({ ...s, fatSelections: fats }));
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

  // ── Drink Recipes actions ─────────────────────────────────────────────────

  const setDrinkRecipeShare = useCallback((index: number, value: number) => {
    setState((s) => ({
      ...s,
      drinkRecipes: rebalanceShares(s.drinkRecipes, index, value) as DrinkRecipeSelection[],
    }));
  }, []);

  const setDrinkRecipeLocked = useCallback((index: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      drinkRecipes: s.drinkRecipes.map((d, i) => (i === index ? { ...d, locked } : d)),
    }));
  }, []);

  const initDrinkRecipes = useCallback((drinks: DrinkRecipeSelection[]) => {
    setState((s) => ({ ...s, drinkRecipes: drinks }));
  }, []);

  // ── Drink Ingredients actions (Milch & Säfte) ──────────────────────────────

  const setDrinkIngredientShare = useCallback((index: number, value: number) => {
    setState((s) => ({
      ...s,
      drinkIngredients: rebalanceShares(s.drinkIngredients, index, value).map((d) => ({
        ...d,
        // Calculate mlPerPerson: 200ml per person for real ingredients, null for virtual option
        mlPerPerson: d.sharePercent > 0 && d.ingredientId > 0 ? 200 : null,
      })) as DrinkIngredientSelection[],
    }));
  }, []);

  const setDrinkIngredientLocked = useCallback((index: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      drinkIngredients: s.drinkIngredients.map((d, i) => (i === index ? { ...d, locked } : d)),
    }));
  }, []);

  const initDrinkIngredients = useCallback((ingredients: DrinkIngredientSelection[]) => {
    setState((s) => ({
      ...s,
      drinkIngredients: ingredients.map((d) => ({
        ...d,
        // Calculate mlPerPerson if not set: 200ml per person for real ingredients
        mlPerPerson: d.mlPerPerson ?? (d.sharePercent > 0 && d.ingredientId > 0 ? 200 : null),
      })),
    }));
  }, []);

  // ── Grams per person ──────────────────────────────────────────────────────

  const setGramsPerPerson = useCallback((value: number) => {
    const clamped = Math.max(50, Math.min(300, value));
    setState((s) => ({ ...s, gramsPerPerson: clamped }));
  }, []);

  // ── Full state replace (for normalise / state-restore) ─────────────────────

  const replaceState = useCallback((next: WizardState) => {
    setState(next);
  }, []);

  // ── Modal actions (Task 17.1-17.4) ────────────────────────────────────────

  const openCreateModal = useCallback(
    (
      type: CreateModalType,
      breakfastTag?: string,
      recipeType?: string,
    ) => {
      setCreateModal({
        isOpen: true,
        type,
        breakfastTag,
        recipeType,
        isSubmitting: false,
        error: null,
      });
    },
    [],
  );

  const closeCreateModal = useCallback(() => {
    setCreateModal({
      isOpen: false,
      type: null,
      isSubmitting: false,
      error: null,
    });
  }, []);

  const setCreateModalSubmitting = useCallback((submitting: boolean) => {
    setCreateModal((m) => ({ ...m, isSubmitting: submitting }));
  }, []);

  const setCreateModalError = useCallback((error: string | null) => {
    setCreateModal((m) => ({ ...m, error }));
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
    // modal state
    createModal,
    openCreateModal,
    closeCreateModal,
    setCreateModalSubmitting,
    setCreateModalError,
    // actions
    setBasisShare,
    setBasisLocked,
    initBasis,
    setToppingShare,
    setToppingLocked,
    setGlobalIntensity,
    initToppings,
    setFatShare,
    setFatLocked,
    initFats,
    addWarmDish,
    removeWarmDish,
    setWarmDishFactor,
    setExtraIngredient,
    removeExtraIngredient,
    setDrinkRecipeShare,
    setDrinkRecipeLocked,
    initDrinkRecipes,
    setDrinkIngredientShare,
    setDrinkIngredientLocked,
    initDrinkIngredients,
    setGramsPerPerson,
    replaceState,
  };
}
