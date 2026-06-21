/**
 * Zustand store for frontend-only recipe modifications ("Magic Buttons").
 *
 * Tracks modifications to recipe items (add, remove, update quantity, scale)
 * without persisting to the database. All nutritional recalculations happen
 * in the frontend using the nutritionCalculator utility.
 */
import { create } from 'zustand';
import type { RecipeItemNutrition } from '@/schemas/recipe';

/** A modification entry for the change log */
export interface Modification {
  type: 'add' | 'remove' | 'update_quantity' | 'scale';
  description: string;
  timestamp: number;
}

/** A recipe item in the modification store (matches RecipeItemNutrition shape) */
export type ModifiableItem = RecipeItemNutrition;

interface RecipeModificationState {
  /** The original recipe items (immutable reference) */
  originalItems: ModifiableItem[];
  /** The currently modified items */
  modifiedItems: ModifiableItem[];
  /** Log of all modifications */
  modifications: Modification[];
  /** Whether any modifications have been made */
  isDirty: boolean;
  /** Original servings count */
  originalPortions: number | null;
  /** Modified servings count */
  modifiedPortions: number | null;

  // --- Actions ---

  /** Initialize the store with original recipe data */
  initialize: (items: ModifiableItem[], servings: number | null) => void;

  /** Add a new item to the recipe */
  addItem: (item: ModifiableItem) => void;

  /** Remove an item by recipe_item_id */
  removeItem: (recipeItemId: number) => void;

  /** Update the quantity/weight of an existing item */
  updateQuantity: (recipeItemId: number, newWeightG: number) => void;

  /** Scale all items to a target number of servings */
  scaleToNormPortion: (factor: number) => void;

  /** Scale all items by an arbitrary factor (servings unchanged) */
  scaleByFactor: (factor: number) => void;

  /** Reset all modifications back to original */
  reset: () => void;
}

export const useRecipeModificationStore = create<RecipeModificationState>((set, get) => ({
  originalItems: [],
  modifiedItems: [],
  modifications: [],
  isDirty: false,
  originalPortions: null,
  modifiedPortions: null,

  initialize: (items, servings) =>
    set({
      originalItems: items,
      modifiedItems: [...items],
      modifications: [],
      isDirty: false,
      originalPortions: servings,
      modifiedPortions: servings,
    }),

  addItem: (item) =>
    set((state) => {
      const newItems = [...state.modifiedItems, item];
      return {
        modifiedItems: newItems,
        modifications: [
          ...state.modifications,
          {
            type: 'add',
            description: `${item.ingredient_name} hinzugefügt (${item.weight_g}g)`,
            timestamp: Date.now(),
          },
        ],
        isDirty: true,
      };
    }),

  removeItem: (recipeItemId) =>
    set((state) => {
      const removedItem = state.modifiedItems.find((i) => i.recipe_item_id === recipeItemId);
      if (!removedItem) return state;
      return {
        modifiedItems: state.modifiedItems.filter((i) => i.recipe_item_id !== recipeItemId),
        modifications: [
          ...state.modifications,
          {
            type: 'remove',
            description: `${removedItem.ingredient_name} entfernt`,
            timestamp: Date.now(),
          },
        ],
        isDirty: true,
      };
    }),

  updateQuantity: (recipeItemId, newWeightG) =>
    set((state) => {
      const item = state.modifiedItems.find((i) => i.recipe_item_id === recipeItemId);
      if (!item) return state;

      const scaleFactor = item.weight_g > 0 ? newWeightG / item.weight_g : 1;

      const updatedItems = state.modifiedItems.map((i) => {
        if (i.recipe_item_id !== recipeItemId) return i;
        return {
          ...i,
          weight_g: newWeightG,
          quantity: i.quantity * scaleFactor,
          energy_kcal: i.energy_kcal * scaleFactor,
          protein_g: i.protein_g * scaleFactor,
          fat_g: i.fat_g * scaleFactor,
          fat_sat_g: i.fat_sat_g * scaleFactor,
          carbohydrate_g: i.carbohydrate_g * scaleFactor,
          sugar_g: i.sugar_g * scaleFactor,
          fibre_g: i.fibre_g * scaleFactor,
          salt_g: i.salt_g * scaleFactor,
          price_eur: i.price_eur !== null ? i.price_eur * scaleFactor : null,
        };
      });

      return {
        modifiedItems: updatedItems,
        modifications: [
          ...state.modifications,
          {
            type: 'update_quantity',
            description: `${item.ingredient_name}: ${Math.round(item.weight_g)}g -> ${Math.round(newWeightG)}g`,
            timestamp: Date.now(),
          },
        ],
        isDirty: true,
      };
    }),

  scaleToNormPortion: (factor) =>
    set((state) => {
      const scaledItems = state.modifiedItems.map((i) => ({
        ...i,
        weight_g: i.weight_g * factor,
        quantity: i.quantity * factor,
        energy_kcal: i.energy_kcal * factor,
        protein_g: i.protein_g * factor,
        fat_g: i.fat_g * factor,
        fat_sat_g: i.fat_sat_g * factor,
        carbohydrate_g: i.carbohydrate_g * factor,
        sugar_g: i.sugar_g * factor,
        fibre_g: i.fibre_g * factor,
        salt_g: i.salt_g * factor,
        price_eur: i.price_eur !== null ? i.price_eur * factor : null,
      }));

      const newServings = 1;

      return {
        modifiedItems: scaledItems,
        modifiedPortions: newServings,
        modifications: [
          ...state.modifications,
          {
            type: 'scale',
            description: `Auf Normportion skaliert (Faktor: ${factor.toFixed(2)})`,
            timestamp: Date.now(),
          },
        ],
        isDirty: true,
      };
    }),

  scaleByFactor: (factor) =>
    set((state) => {
      const scaledItems = state.modifiedItems.map((i) => ({
        ...i,
        weight_g: i.weight_g * factor,
        quantity: i.quantity * factor,
        energy_kcal: i.energy_kcal * factor,
        protein_g: i.protein_g * factor,
        fat_g: i.fat_g * factor,
        fat_sat_g: i.fat_sat_g * factor,
        carbohydrate_g: i.carbohydrate_g * factor,
        sugar_g: i.sugar_g * factor,
        fibre_g: i.fibre_g * factor,
        salt_g: i.salt_g * factor,
        price_eur: i.price_eur !== null ? i.price_eur * factor : null,
      }));

      return {
        modifiedItems: scaledItems,
        modifications: [
          ...state.modifications,
          {
            type: 'scale',
            description: `Alle Zutaten skaliert (Faktor: ${factor.toLocaleString('de-DE', { maximumFractionDigits: 2 })})`,
            timestamp: Date.now(),
          },
        ],
        isDirty: true,
      };
    }),

  reset: () => {
    const state = get();
    set({
      modifiedItems: [...state.originalItems],
      modifications: [],
      isDirty: false,
      modifiedPortions: state.originalPortions,
    });
  },
}));
