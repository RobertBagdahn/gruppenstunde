/**
 * Tests for useRecipeModificationStore (Zustand store).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRecipeModificationStore,
  type ModifiableItem,
} from '@/store/useRecipeModificationStore';

/** Helper to create a ModifiableItem (RecipeItemNutrition shape) with defaults. */
function makeModifiableItem(overrides: Partial<ModifiableItem> = {}): ModifiableItem {
  return {
    recipe_item_id: 1,
    ingredient_id: 100,
    ingredient_name: 'Mehl',
    quantity: 1,
    portion_name: 'Stück',
    weight_g: 200,
    price_eur: null,
    energy_kj: 1400,
    energy_kcal: 340,
    protein_g: 10,
    fat_g: 1,
    fat_sat_g: 0.2,
    carbohydrate_g: 72,
    sugar_g: 0.5,
    fibre_g: 3,
    salt_g: 0.01,
    weight_pct: 100,
    contributions: [],
    ...overrides,
  };
}

// Reset store between tests
beforeEach(() => {
  useRecipeModificationStore.setState({
    originalItems: [],
    modifiedItems: [],
    modifications: [],
    isDirty: false,
    originalServings: null,
    modifiedServings: null,
  });
});

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

describe('initialize', () => {
  it('sets items and resets dirty state', () => {
    const items = [makeModifiableItem(), makeModifiableItem({ recipe_item_id: 2 })];
    const { initialize } = useRecipeModificationStore.getState();

    initialize(items, 4);

    const state = useRecipeModificationStore.getState();
    expect(state.modifiedItems).toHaveLength(2);
    expect(state.originalItems).toHaveLength(2);
    expect(state.isDirty).toBe(false);
    expect(state.modifications).toHaveLength(0);
    expect(state.originalServings).toBe(4);
    expect(state.modifiedServings).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

describe('addItem', () => {
  it('adds an item and marks dirty', () => {
    const { initialize } = useRecipeModificationStore.getState();
    initialize([makeModifiableItem()], 4);

    const newItem = makeModifiableItem({
      recipe_item_id: 99,
      ingredient_name: 'Zucker',
      weight_g: 50,
    });
    useRecipeModificationStore.getState().addItem(newItem);

    const state = useRecipeModificationStore.getState();
    expect(state.modifiedItems).toHaveLength(2);
    expect(state.modifiedItems[1].ingredient_name).toBe('Zucker');
    expect(state.isDirty).toBe(true);
    expect(state.modifications).toHaveLength(1);
    expect(state.modifications[0].type).toBe('add');
  });
});

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe('removeItem', () => {
  it('removes an item by recipe_item_id', () => {
    const items = [
      makeModifiableItem({ recipe_item_id: 1 }),
      makeModifiableItem({ recipe_item_id: 2, ingredient_name: 'Zucker' }),
    ];
    const { initialize } = useRecipeModificationStore.getState();
    initialize(items, null);

    useRecipeModificationStore.getState().removeItem(1);

    const state = useRecipeModificationStore.getState();
    expect(state.modifiedItems).toHaveLength(1);
    expect(state.modifiedItems[0].recipe_item_id).toBe(2);
    expect(state.isDirty).toBe(true);
    expect(state.modifications).toHaveLength(1);
    expect(state.modifications[0].type).toBe('remove');
  });

  it('does nothing when removing a nonexistent item', () => {
    const items = [makeModifiableItem({ recipe_item_id: 1 })];
    const { initialize } = useRecipeModificationStore.getState();
    initialize(items, null);

    useRecipeModificationStore.getState().removeItem(999);

    const state = useRecipeModificationStore.getState();
    expect(state.modifiedItems).toHaveLength(1);
    expect(state.isDirty).toBe(false);
    expect(state.modifications).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------

describe('updateQuantity', () => {
  it('updates weight and scales nutritional values proportionally', () => {
    const item = makeModifiableItem({
      recipe_item_id: 1,
      weight_g: 200,
      energy_kcal: 340,
      protein_g: 10,
    });
    const { initialize } = useRecipeModificationStore.getState();
    initialize([item], null);

    // Double the weight: 200g -> 400g
    useRecipeModificationStore.getState().updateQuantity(1, 400);

    const state = useRecipeModificationStore.getState();
    const updated = state.modifiedItems[0];
    expect(updated.weight_g).toBe(400);
    expect(updated.energy_kcal).toBe(680); // 340 * 2
    expect(updated.protein_g).toBe(20); // 10 * 2
    expect(state.isDirty).toBe(true);
    expect(state.modifications).toHaveLength(1);
    expect(state.modifications[0].type).toBe('update_quantity');
  });
});

// ---------------------------------------------------------------------------
// scaleToNormPortion
// ---------------------------------------------------------------------------

describe('scaleToNormPortion', () => {
  it('halves all item weights with factor 0.5', () => {
    const items = [
      makeModifiableItem({ recipe_item_id: 1, weight_g: 200, energy_kcal: 340 }),
      makeModifiableItem({ recipe_item_id: 2, weight_g: 100, energy_kcal: 50 }),
    ];
    const { initialize } = useRecipeModificationStore.getState();
    initialize(items, 4);

    useRecipeModificationStore.getState().scaleToNormPortion(0.5);

    const state = useRecipeModificationStore.getState();
    expect(state.modifiedItems[0].weight_g).toBe(100);
    expect(state.modifiedItems[0].energy_kcal).toBe(170);
    expect(state.modifiedItems[1].weight_g).toBe(50);
    expect(state.modifiedItems[1].energy_kcal).toBe(25);
    expect(state.isDirty).toBe(true);
    expect(state.modifiedServings).toBe(1); // always set to 1 per spec
    expect(state.modifications).toHaveLength(1);
    expect(state.modifications[0].type).toBe('scale');
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('restores original items and clears modifications', () => {
    const items = [makeModifiableItem({ recipe_item_id: 1, weight_g: 200 })];
    const { initialize } = useRecipeModificationStore.getState();
    initialize(items, 4);

    // Make some modifications
    useRecipeModificationStore.getState().updateQuantity(1, 400);
    useRecipeModificationStore.getState().addItem(
      makeModifiableItem({ recipe_item_id: 99, ingredient_name: 'Zucker' }),
    );

    // Verify dirty state
    let state = useRecipeModificationStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.modifiedItems).toHaveLength(2);
    expect(state.modifications).toHaveLength(2);

    // Reset
    useRecipeModificationStore.getState().reset();

    state = useRecipeModificationStore.getState();
    expect(state.modifiedItems).toHaveLength(1);
    expect(state.modifiedItems[0].weight_g).toBe(200);
    expect(state.isDirty).toBe(false);
    expect(state.modifications).toHaveLength(0);
    expect(state.modifiedServings).toBe(4);
  });
});
