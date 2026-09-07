## Architecture & Design Decisions

### 1. Recipe Verification Per-Serving Scaling
In `backend/recipe/services/verification_service.py`:
Currently, `_evaluate_rules()` reads `getattr(recipe, cached_field)` and passes it raw to `rule.evaluate(float(value))`.
Since recipe rules define thresholds per portion (e.g. 500 kcal per serving), the evaluation must scale the per-100g cached values by `serving_weight / 100`:
```python
recipe_weight = recipe.cached_weight_g or 0.0
recipe_servings = recipe.portions or 1
serving_weight = (recipe_weight / recipe_servings) if recipe_servings > 0 else 0.0
factor = serving_weight / 100.0

# For nutrient parameters:
eval_value = float(value) * factor if rule.parameter not in ("nutri_class", "weight_g", "price_total") else float(value)
status = rule.evaluate(eval_value)
```
This guarantees identical results between `recipe_checks.evaluate_recipe_rules()` and `verification_service.check_verification_readiness()`.

### 2. Centralized Cache Invalidation Helper in `frontend-food`
Add `invalidateMealPlanData(queryClient: QueryClient, planId: number)` in `frontend-food/src/api/mealPlans.ts`:
```typescript
export function invalidateMealPlanData(queryClient: QueryClient, planId: number): void {
  queryClient.invalidateQueries({ queryKey: ['meal-plan', planId] });
  queryClient.invalidateQueries({ queryKey: ['meal-plan-nutrition', planId] });
  queryClient.invalidateQueries({ queryKey: ['meal-plan-costs', planId] });
  queryClient.invalidateQueries({ queryKey: ['meal-plan-shopping', planId] });
  queryClient.invalidateQueries({ queryKey: ['meal-plan-suggestions', planId] });
  queryClient.invalidateQueries({ queryKey: ['cooking-schedule', planId] });
  queryClient.invalidateQueries({ queryKey: ['ingredient-scan', planId] });
  queryClient.invalidateQueries({ queryKey: ['refMeals', planId] });
}
```
All mutations affecting items, days, portions, and meal settings will call this helper on success.

Also update `invalidateRecipeData(queryClient, recipeId)` in `frontend-food/src/api/recipes.ts` to include:
```typescript
queryClient.invalidateQueries({ queryKey: ['recipe-verification-status', recipeId] });
```

### 3. Dual-Sided Tag Robustness
1. **Frontend:** In `WizardStepMetadata.tsx`, pass `valueKey="id"` to `<TagMultiSelect selectedSlugs={selectedTagSlugs} valueKey="id" />`.
2. **Backend:** In `backend/recipe/api/recipes.py` (`create_recipe` and `update_recipe`), resolve incoming elements in `tag_ids`:
```python
resolved_tags = []
for item in tag_ids:
    if isinstance(item, str) and not is_valid_uuid(item):
        tag = Tag.objects.filter(slug=item).first()
        if tag:
            resolved_tags.append(tag)
    else:
        resolved_tags.append(item)
recipe.tags.set(resolved_tags)
```

### 4. Date & Timezone Handling in Planner Settings
- In `frontend-food/src/pages/planning/SettingsPanel.tsx`, format dates using `format(parseISO(isoString), "yyyy-MM-dd'T'HH:mm")` and convert back to valid ISO strings with timezone offsets.
- In `backend/planner/api/meal_plan.py:506-515`:
```python
if payload.start_datetime is not None:
    if timezone.is_naive(payload.start_datetime):
        meal_plan.start_datetime = timezone.make_aware(payload.start_datetime)
    else:
        meal_plan.start_datetime = payload.start_datetime

if payload.end_datetime is not None:
    if timezone.is_naive(payload.end_datetime):
        meal_plan.end_datetime = timezone.make_aware(payload.end_datetime)
    else:
        meal_plan.end_datetime = payload.end_datetime

if meal_plan.end_datetime and meal_plan.start_datetime and meal_plan.end_datetime < meal_plan.start_datetime:
    raise HttpError(400, "Das Enddatum darf nicht vor dem Startdatum liegen.")
```

### 5. Deletion Protection in `MealSlot`
- Wrap recipe item deletion and meal slot deletion in `ConfirmDialog` to avoid accidental deletes during busy prep.
- In `MealEventDetailPage.tsx`, disable the "Tag löschen" button for days that are neither the minimum nor maximum date in `dayGroups`.

### 6. Cooking Mode Screen Wake-Lock & Progress Cache
- In `RecipeCookingMode.tsx`:
  - Request `navigator.wakeLock.request('screen')` on mount, re-request on `visibilitychange`.
  - Store `checkedIngredientIds` and `currentStep` in `sessionStorage` keyed by `cooking_mode_${recipeSlug}`.
