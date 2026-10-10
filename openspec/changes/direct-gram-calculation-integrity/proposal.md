# Direct-Gram Recipe Item Calculation Integrity

## Why

`RecipeItem.portion = NULL` is documented as a direct-gram item: `quantity` is the amount in grams. The current implementation only supports that interpretation in selected display/export paths. On the inspected `main` checkout, the recipe PDF scales and displays the amount in grams, but nutrition aggregation returns no weight for a portionless item, and the canonical planner resolver and recipe shopping-list traversal skip it.

A portionless `RecipeItem` also has no direct `Ingredient` relation. Its name may be present in `note`, but a free-text note is not a reliable basis for nutrient lookup, pricing, ingredient aggregation, or ingredient-specific warnings. This missing identity is the underlying model gap; fixing only the gram arithmetic would still leave nutrition and shopping-list behavior incomplete.

## What Changes

- Define one consistent contract for direct-gram recipe items: `quantity` is grams, and a direct-gram item that should participate in ingredient-based calculations must reference its `Ingredient` explicitly, independently of `portion_id`.
- Add the optional ingredient relation needed to identify portionless items. Keep portion-based items working through their existing `portion.ingredient` relation; prevent or validate inconsistent ingredient/portion combinations.
- Include linked direct-gram items in recipe weight and nutritional calculations, using `quantity / 100` to scale the linked ingredient's per-100g nutritional values. Keep recipe totals, cached values, and downstream meal-plan calculations consistent.
- Include linked direct-gram items in meal-plan shopping-list aggregation, source attribution, scaling, pricing, and other ingredient-based consumers, using their stored gram quantity as the weight basis.
- Keep direct-gram quantities and ingredient identity consistent in recipe and meal-plan exports. Preserve the already-working recipe-PDF gram scaling/display rather than reimplementing it; ensure exports show the linked ingredient and do not silently omit the item.
- Update recipe-item create/update/read schemas and Food-Frontend Zod schemas and relevant recipe/meal-plan consumers in sync.
- Do not infer ingredient identity from existing free-text notes. Existing portionless records without an explicit ingredient remain displayable as unresolved direct-gram items and are excluded from ingredient-specific nutrition, pricing, and shopping aggregation until linked.

## Capabilities

### New Capabilities
- `direct-gram-recipe-items`: Defines the identity, gram semantics, validation, and cross-consumer behavior of recipe items without a portion.

### Modified Capabilities
- `recipe`: Recipe item APIs and recipe nutrition/weight calculations support portionless items linked directly to an ingredient.
- `recipe-pdf-export`: Recipe PDF output preserves direct-gram quantities while including the linked ingredient consistently.
- `shopping-list`: Meal-plan shopping aggregation includes active linked direct-gram recipe items in the same way as portion-based recipe items.
- `meal-plan-budget-cockpit`: Ingredient-linked quantities and prices remain consistent when a recipe contains direct-gram items.

## Impact

- **Backend models and APIs:** `backend/recipe/models/items.py`, recipe item schemas and endpoints under `backend/recipe/schemas/` and `backend/recipe/api/`.
- **Backend calculations and exports:** recipe nutrition/weight calculations and cache invalidation; `backend/planner/services/calculation_context.py`; meal-plan shopping-list and budget consumers including `backend/supply/services/shopping_service.py`; recipe and meal-plan PDF/export paths.
- **Food Frontend:** Pydantic/Zod contract synchronization in `frontend-food/src/api/recipes.ts` and any affected recipe-item editors and meal-plan consumers. The main frontend must remain unaffected.
- **Database:** A migration is required for the optional direct ingredient relation. Existing portionless rows must not be automatically matched to ingredients based on `note`; they remain unresolved until explicitly linked.
- **Tests:** Add backend coverage for linked and unresolved portionless items, nutrition/cache invalidation, shopping-list totals and sources, scaling, and export output. Update Food-Frontend schema and workflow tests where the item contract changes.
- **Existing behavior on `main`:** Direct-gram quantity display/scaling in recipe PDF is already present and must be retained. This change closes the currently missing ingredient-linked calculation and aggregation paths rather than claiming that all direct-gram behavior is new.
