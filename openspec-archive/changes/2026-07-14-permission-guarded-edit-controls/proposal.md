## Why

Edit controls (buttons, drag handles, delete actions) are inconsistently guarded across the food frontend. Some resources show edit/delete buttons to all users regardless of permissions, while others properly check `can_edit`/`can_delete`. The root cause: no shared convention for exposing permission fields in API schemas, leading to missing `can_edit`/`can_delete` fields on ingredient, shopping list, meal plan, and ref meal schemas — and no frontend guards on the corresponding UI controls.

## What Changes

- **New shared Pydantic mixin** `HasPermissions` in `core/schemas.py` with `can_edit: bool` and `can_delete: bool`, usable by any resource schema
- **New shared Zod base** `permissionBaseSchema` in `frontend-food/src/schemas/base.ts` with `can_edit: z.boolean()` and `can_delete: z.boolean()`
- **BREAKING**: `can_edit` and `can_delete` added to `IngredientDetailOut`, `IngredientListOut`, `MaterialOut`, `ShoppingListOut` (list), `MealPlanOut` (list), and `RefMealOut` schemas — all clients must handle these fields
- Frontend `canEdit` computation for ingredients switches from client-side (`user.id === created_by_id`) to server-provided `can_edit`/`can_delete`
- PortionCard, SortablePortionItem, and DndContext on ingredient detail page guarded by `canEdit`
- IngredientCard delete button on list page guarded by `can_delete`
- MealPlanListPage dropdown (delete + copy as template) guarded by `can_edit`/`is_owner`
- RefMealEditorPage guarded by `canEdit` permission check

## Capabilities

### New Capabilities
- `permission-base-schema`: Shared Pydantic mixin (`HasPermissions`) and Zod base schema (`permissionBaseSchema`) providing `can_edit: bool` and `can_delete: bool` fields for all resource schemas. Establishes the convention that every resource detail and list schema MUST expose these fields.

### Modified Capabilities
- `ingredient-database`: Ingredient detail and list schemas now include `can_edit`/`can_delete`. Frontend guards PortionCard edit/delete, portion drag handles, DndContext, and ingredient card delete with permission checks.
- `shopping-list`: Shopping list list schema now includes `can_edit`/`can_delete`.
- `meal-plan`: Meal plan list schema now includes `can_edit`/`can_delete`. MealPlanListPage dropdown actions guarded by permission checks.
- `ref-meal-editor`: RefMeal schema now includes `can_edit`/`can_delete`. RefMealEditorPage guarded by permission check.

## Impact

- **Backend**: `core/schemas.py` (new), `supply/schemas/ingredients.py`, `supply/schemas/materials.py`, `supply/api/ingredients.py`, `shopping/schemas.py`, `shopping/api.py`, `planner/schemas/meal_plans.py`, `planner/api/meal_plans.py`, `planner/schemas/ref_meals.py`, `planner/api.py`
- **Frontend**: `schemas/base.ts` (new), `schemas/supply.ts`, `schemas/shoppingList.ts`, `schemas/mealPlan.ts`, `pages/ingredients/IngredientDetailPage.tsx`, `pages/ingredients/IngredientListPage.tsx`, `components/ingredients/SortablePortionItem.tsx`, `components/ingredient/IngredientCard.tsx`, `pages/planning/MealEventListPage.tsx`, `pages/planning/RefMealEditorPage.tsx`
- **No database migrations** — schema-only changes, no model changes
