## Context

The meal plan detail view (`MealSlot.tsx`) renders two types of `MealItem`: **recipe-based** (has `recipe_id`) and **ingredient-based** (has `ingredient_id`, no recipe). For recipe items, the FactorInput component provides an inline text field to adjust the `factor` multiplier. For ingredient items, the code at line 441 checks `isIngredient && item.quantity != null` first — which is always true for ingredients — and renders a static `×6000 g` label instead of the FactorInput.

Separately, `FactorInput.tsx` formats the factor with `toFixed(1)`, rounding to one decimal place on display. On the next edit, the displayed value (e.g. `0,8`) replaces the original (e.g. `0.753`), silently losing precision with each round-trip.

### Current data flow

```
Backend:  MealItemOut { factor: 1.0, quantity: 6000, ... }
                    │
                    ▼
MealSlot.tsx  ┌─ isIngredient && quantity != null? ──→ ×6000 g (static)
              │                                        (factor hidden)
              └─ else (recipe items) ──→ FactorInput
                                           │
                                           ▼
                                        factor: 0,8 (toFixed(1) precision loss)
                                           │
                                           ▼
Backend PATCH: factor → 0.8  ← WRONG
```

## Goals / Non-Goals

**Goals:**
- Ingredient items show an editable FactorInput (like recipe items already do)
- FactorInput preserves full precision on display (no silent rounding)
- Existing quantity display for ingredients is preserved alongside the factor
- Layout is clear on mobile (320px) — fields stack gracefully

**Non-Goals:**
- No backend changes — API already supports `PATCH factor` for all MealItems
- No model changes — `MealItem.factor` already exists on all items
- No edit-in-place for quantity (display-only, changed via adding/removing items)
- No price editing — price is computed from ingredient data, not manually set

## Decisions

### 1. Show FactorInput for all ingredient items

Restructure the ternary at `MealSlot.tsx:441-450` from:

```typescript
{isIngredient && item.quantity != null ? (
  <span className="text-xs text-muted-foreground">
    ×{item.quantity}
    {item.measuring_unit_name ? ` ${item.measuring_unit_name}` : ''}
  </span>
) : canEdit && !meal.is_synced ? (
  <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
) : (
  item.factor !== 1.0 && <span>×{item.factor.toFixed(1).replace('.', ',')}</span>
)}
```

To:

```typescript
{canEdit && !meal.is_synced ? (
  <>
    {isIngredient && item.quantity != null && (
      <span className="text-xs text-muted-foreground">
        ×{item.quantity}
        {item.measuring_unit_name ? ` ${item.measuring_unit_name}` : ''}
      </span>
    )}
    <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
  </>
) : (
  <>
    {isIngredient && item.quantity != null && (
      <span>×{item.quantity}{item.measuring_unit_name ? ` ${item.measuring_unit_name}` : ''}</span>
    )}
    {item.factor !== 1.0 && <span>×{item.factor.toFixed(2).replace('.', ',')}</span>}
  </>
)}
```

This makes the quantity and factor independent — both render for ingredient items, the factor is always editable when `canEdit && !meal.is_synced`.

### 2. Increase FactorInput precision to toFixed(2)

Change `FactorInput.tsx:4` from `toFixed(1)` to `toFixed(2)`. Two decimal places is sufficient for all practical factor values (users adjust in 0.05 or 0.1 increments), and avoids the bug where `0.75` would display as `0,8` and save as `0.8`.

### 3. Desktop vs mobile layout

```
Desktop (>480px):  26500 kcal  ×6000 g  ×[1,00]  [delete]
Mobile  (<480px):  26500 kcal
                   ×6000 g  ×[1,00]  [delete]
```

The existing flex container already wraps gracefully on mobile. No layout changes needed.

## Risks / Trade-offs

- **Existing ingredient items with wrong factors** (like factor=15 from the user's report) will now be visible and editable. The displayed kcal may jump significantly when the user corrects the factor — this is correct behavior, not a bug.
- **`toFixed(2)` may truncate very small factors** (e.g. 0.001 → "0,00"). In practice, factors below 0.01 are filtered out in `MealSlot.tsx:375` (`if (item.factor < 0.01) continue`), so this is acceptable.
