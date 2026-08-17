## 1. Backend Model & Migration

- [x] 1.1 Rename `allergen_tags` to `nutritional_tags` on `MealPlan` model, remove `limit_choices_to={"is_dangerous": True}`
- [x] 1.2 Run `uv run python manage.py makemigrations planner` and apply migration

## 2. Backend Schemas

- [x] 2.1 Rename `allergen_tag_ids` → `nutritional_tag_ids` in `MealPlanOut`, `MealPlanDetailOut`, `MealPlanCreateIn`, `MealPlanUpdateIn`
- [x] 2.2 Rename `allergen_tags` → `nutritional_tags` in `MealPlanDetailOut`
- [x] 2.4 Rename `allergen_tag` → `nutritional_tag` in `AllergenViolationOut` (now `NutritionalTagViolationOut`)
- [x] 2.5 Rename `allergen_tags` → `nutritional_tags` in `AllergenScanOut` (now `NutritionalTagScanOut`)

## 3. Backend API

- [x] 3.1 Update `create_meal_plan` to reference `nutritional_tag_ids` and remove `is_dangerous` validation
- [x] 3.2 Update `update_meal_plan` to reference `nutritional_tag_ids` and remove `is_dangerous` validation
- [x] 3.3 Update `get_allergen_scan` to check ALL recipe tags (remove `tag.is_dangerous` filter), update response field names
- [x] 3.4 Update `search_recipes` / `search_ingredients` if they reference `allergen_tags` (check code)

## 4. Frontend Zod Schemas

- [x] 4.1 Rename `allergen_tag_ids` → `nutritional_tag_ids` in `MealPlanSchema` (`mealPlan.ts`)
- [x] 4.2 Rename `allergen_tag_ids` → `nutritional_tag_ids` / `allergen_tags` → `nutritional_tags` in `MealPlanDetailSchema`
- [x] 4.3 Rename `allergen_tag_names` → `nutritional_tag_names` in `MealPlanSchema`
- [x] 4.4 Rename `allergen_tag` → `nutritional_tag` in `AllergenViolationSchema` (now `NutritionalTagViolationSchema`)
- [x] 4.5 Rename `allergen_tags` → `nutritional_tags` in `AllergenScanResponseSchema` (now `NutritionalTagScanResponseSchema`)

## 5. Frontend API Hooks

- [x] 5.1 Update `useCreateMealPlan` mutation body type: `allergen_tag_ids` → `nutritional_tag_ids`
- [x] 5.2 Update `useUpdateMealPlan` mutation body type: `allergen_tag_ids` → `nutritional_tag_ids`
- [x] 5.3 Update any other hooks/types referencing `allergen_tag_ids` (search, allergen scan)

## 6. Frontend SettingsPanel

- [x] 6.1 Replace custom button-based tag selector with `NutritionalTagMultiSelect` component
- [x] 6.2 Remove `filter(t => t.is_dangerous)` — show all tags
- [x] 6.3 Rename state + prop from `allergenTagIds` / `allergen_tag_ids` to `nutritionalTagIds` / `nutritional_tag_ids`
- [x] 6.4 Update section heading from "Allergen-Scanner Konfiguration" to "Ernährung & Allergene"

## 7. Frontend Create Dialog

- [x] 7.1 Add `NutritionalTagMultiSelect` component to the create dialog in `MealEventListPage.tsx`
- [x] 7.2 Add state for `nutritionalTagIds` in the create dialog
- [x] 7.3 Pass `nutritional_tag_ids` in `createMutation.mutate()` body

## 8. Frontend RecipeSearchDialog & Plan Detail

- [x] 8.1 Rename `allergenTagIds` prop to `nutritionalTagIds` in `RecipeSearchDialog`
- [x] 8.2 Update all callers that pass `allergenTagIds` to use `nutritionalTagIds`
- [x] 8.3 Update plan detail page (`MealEventDetailPage`) to pass `nutritional_tag_ids` from plan data
- [x] 8.4 Update `AllergenWarningBadge` usage if props reference old field names

## 9. Tests

- [x] 9.1 Test MealPlan create with `nutritional_tag_ids` including non-dangerous tags
- [x] 9.2 Test MealPlan update with `nutritional_tag_ids`
- [x] 9.3 Test allergen scan detects violations for non-dangerous tag matches
- [x] 9.4 Test allergen scan response uses new field names
- [x] 9.5 Run full test suite: `uv run pytest`
