## 1. Backend: Shared Permission Base Schema

- [x] 1.1 Create `backend/core/schemas.py` with `HasPermissions(BaseModel)` mixin containing `can_edit: bool` and `can_delete: bool`
- [x] 1.2 Verify `content/schemas/base.py` Content schemas are unaffected (keep their own `can_edit`/`can_delete`)

## 2. Backend: Ingredient Schema + API Annotation

- [x] 2.1 Add `can_edit: bool = False` and `can_delete: bool = False` to `IngredientDetailOut` in `supply/schemas/ingredients.py`
- [x] 2.2 Add `can_edit: bool = False` and `can_delete: bool = False` to `IngredientListItemOut` in `supply/schemas/ingredients.py`
- [x] 2.3 In ingredient detail endpoint, annotate `can_edit` using `_can_edit_ingredient()` and `can_delete` using existing delete permission logic (staff or `created_by_id` match)
- [x] 2.4 In ingredient list endpoint, annotate `can_edit`/`can_delete` for each item in the response loop

## 3. Backend: Material Schema + API Annotation

- [x] 3.1 Add `can_edit: bool = False` and `can_delete: bool = False` to `MaterialOut` in `supply/schemas/materials.py`
- [x] 3.2 In material detail endpoint, set `can_edit = request.user.is_staff`, `can_delete = request.user.is_staff` (materials are globally shared, only staff can modify)
- [x] 3.3 In material list endpoint, annotate `can_edit`/`can_delete` for each item

## 4. Backend: Shopping List Schema + API Annotation

- [x] 4.1 Add `can_edit: bool = False` and `can_delete: bool = False` to the shopping list list item schema in `shopping/schemas.py`
- [x] 4.2 In shopping list list endpoint, resolve `can_edit`/`can_delete` based on owner/collaborator status for each list

## 5. Backend: Meal Plan Schema + API Annotation

- [x] 5.1 Add `can_edit: bool = False` and `can_delete: bool = False` to the meal plan list item schema in `planner/schemas/meal_plans.py`
- [x] 5.2 In meal plan list endpoint, resolve `can_edit`/`can_delete` using existing `_can_edit_meal_plan()` for each plan

## 6. Backend: RefMeal Schema + API Annotation

- [x] 6.1 Add `can_edit: bool = False` and `can_delete: bool = False` to RefMeal schema in `planner/schemas/ref_meals.py`
- [x] 6.2 In RefMeal detail endpoint, resolve `can_edit`/`can_delete` from the parent MealPlan's edit permission

## 7. Frontend: Shared Zod Permission Base

- [x] 7.1 Create `frontend-food/src/schemas/base.ts` with `permissionBaseSchema` containing `can_edit: z.boolean()` and `can_delete: z.boolean()`

## 8. Frontend: Zod Schema Updates

- [x] 8.1 Update `IngredientDetailSchema` and `IngredientListItemSchema` in `schemas/supply.ts` to include `can_edit`/`can_delete` (merge `permissionBaseSchema`)
- [x] 8.2 Update `MaterialSchema` in `schemas/supply.ts` to include `can_edit`/`can_delete`
- [x] 8.3 Update `ShoppingListSchema` (list) in `schemas/shoppingList.ts` to include `can_edit`/`can_delete`
- [x] 8.4 Update `MealPlanSchema` (list) in `schemas/mealPlan.ts` to include `can_edit`/`can_delete`
- [x] 8.5 Update `RefMealSchema` in `schemas/mealPlan.ts` to include `can_edit`/`can_delete`

## 9. Frontend: Ingredient Detail Page Guards

- [x] 9.1 Replace client-side `canEdit` computation with `ingredient?.can_edit ?? false` and `ingredient?.can_delete ?? false`
- [x] 9.2 Pass `canEdit` prop to `PortionCard` component
- [x] 9.3 In `PortionCard`, wrap edit button and delete button with `{canEdit && ...}` guard
- [x] 9.4 Pass `canEdit` prop to `SortablePortionItem` component
- [x] 9.5 In `SortablePortionItem`, hide `GripVertical` drag handle when `!canEdit`
- [x] 9.6 In `PortionsSection`, conditionally render `DndContext`/`SortableContext` based on `canEdit` (render simple list when `!canEdit`)

## 10. Frontend: Ingredient List Page Guards

- [x] 10.1 In `IngredientListPage`, only pass `onDelete` to `IngredientCard` when `ingredient.can_delete` is `true`
- [x] 10.2 In `IngredientCard`, guard delete button with the same `can_delete` check

## 11. Frontend: Meal Plan List Page Guards

- [x] 11.1 In `MealEventListPage`, guard "Löschen" dropdown item with `plan.can_delete` or `plan.is_owner`
- [x] 11.2 Guard "Als Vorlage verwenden" dropdown item with `plan.can_edit` or `plan.is_owner`

## 12. Frontend: RefMeal Editor Page Guard

- [x] 12.1 In `RefMealEditorPage`, fetch RefMeal and check `can_edit` before rendering edit controls
- [x] 12.2 Show "Keine Berechtigung" message when `can_edit` is `false`
- [x] 12.3 Disable or hide all edit controls (save, sync, link all, normalize, remove items, factor inputs) when `!canEdit`

## 13. Convention Documentation

- [x] 13.1 Add `permission-base-schema` convention to `backend/AGENTS.md`: all resource schemas must include `can_edit`/`can_delete`
- [x] 13.2 Add `permission-base-schema` convention to `frontend-food/AGENTS.md`: all resource schemas must merge `permissionBaseSchema`, frontend must never compute permissions client-side

## 14. Verification

- [x] 14.1 Run `uv run python manage.py check` to verify backend code compiles
- [x] 14.2 Run `cd frontend-food && npm run typecheck` to verify TypeScript types
- [x] 14.3 Manual test: view `/ingredients/linsen-rot` as non-owner — verify no edit buttons, no drag handles, no delete buttons on portions
- [x] 14.4 Manual test: view `/ingredients` as non-owner — verify delete button only shows on own ingredients
- [x] 14.5 Manual test: view meal plan list as non-owner — verify dropdown actions are hidden
- [x] 14.6 Manual test: navigate to RefMeal editor as non-owner — verify "Keine Berechtigung" message
