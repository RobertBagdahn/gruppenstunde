## Context

The `import_cooklang` command parses `.cook` files and creates Recipe + RecipeItem records. Currently it only links existing `Ingredient` records by exact name match. If not found, it sets `ingredient=None` and stores the name in `note`. The frontend then cannot display these properly because:

1. `IngredientList.tsx` always routes through `formatQuantity(weightG)` which assumes grams
2. `smartRound()` rounds values < 2.5 to 0 (rounding to nearest 5)
3. Items without `ingredient_slug` render as plain text (not clickable)

Current data: 634 RecipeItems with both `portion=None` and `ingredient=None`.

## Goals / Non-Goals

**Goals:**
- Cooklang import creates Ingredient + Portion for unknown ingredients
- Frontend correctly displays non-weight units (Stück, EL, TL, Prise, etc.)
- Small quantities don't round to 0
- Re-import produces fully linked, correctly displayed recipes

**Non-Goals:**
- Nutritional data for auto-created ingredients (they get zeros, can be enriched later)
- Matching fuzzy ingredient names (e.g., "Knoblauchzehe" → "Knoblauch")
- Changing the RecipeItem or Ingredient model structure

## Decisions

### 1. Auto-create Ingredient with status `user_content`

New ingredients get `status="user_content"` (not `verified`) to distinguish them from curated data. They can be enriched later via AI or manual editing.

### 2. Default Portion "1 g" for new Ingredients

Every new Ingredient gets a Portion with `name="", measuring_unit=Gramm, weight_g=1.0, quantity=1.0`. This ensures the frontend weight calculation works: `quantity * weight_g = quantity * 1 = quantity in grams`.

However, for Stück-based ingredients, we also create a Portion with `measuring_unit=Stück, weight_g=0` — the frontend will handle Stück display differently (see decision 3).

Actually simpler: **Don't create a Stück portion.** Just fix the frontend to not route through `formatQuantity` when the RecipeItem's `measuring_unit` is not g/kg/ml/l.

### 3. Frontend: branch on measuring_unit type

```
if measuring_unit is weight (g, kg) or volume (ml, l):
    use existing formatQuantity(weightG) logic
else:
    display: "{quantity} {measuring_unit_name} {ingredient_name}"
```

This means "1 Stück Paprika", "1 EL Olivenöl", "1 TL Paprikapulver" display correctly without any gram conversion.

### 4. smartRound fix

Change `smartRound` to not round values < 5:
```ts
if (value < 5) return Math.round(value);  // 1→1, 2.5→3, 0.5→1
```

### 5. Re-import strategy

Delete all recipes created by the Cooklang import (identified by `summary` containing "Cooklang"), then re-run. No migration needed.

## Risks / Trade-offs

- **Auto-created ingredients have no nutritional data** — acceptable, they show "keine Nährwerte" until enriched
- **Name matching is exact** — "Knoblauchzehe" won't match "Knoblauch". Acceptable for now; fuzzy matching is a separate feature.
- **Changing smartRound affects all recipes** — but only improves display for small quantities, no regression for values >= 5
