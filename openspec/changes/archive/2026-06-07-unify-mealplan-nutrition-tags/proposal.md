## Why

MealPlan akzeptiert derzeit nur Allergen-Tags (`is_dangerous=True`), nicht aber Ernährungspräferenzen wie vegan, vegetarisch oder halal. Dadurch kann ein Plan keine diätischen Präferenzen ausdrücken und die Rezeptsuche nicht automatisch danach filtern. Zudem landet die Tag-Auswahl erst nach der Planerstellung in den Settings — der Create-Dialog hat gar keine Tag-Auswahl.

## What Changes

- **BREAKING**: `MealPlan.allergen_tags` wird zu `MealPlan.nutritional_tags` umbenannt, `limit_choices_to={"is_dangerous": True}` entfällt
- **BREAKING**: Alle Schemas und API-Felder `allergen_tag_ids` → `nutritional_tag_ids` / `allergen_tags` → `nutritional_tags`
- Allergen-Scan vergleicht nun **alle** `nutritional_tags` des Rezepts mit den Plan-Tags (nicht nur `is_dangerous=True`)
- Tag-Auswahl im Create-Dialog (`MealEventListPage`) wird hinzugefügt
- SettingsPanel verwendet `NutritionalTagMultiSelect` statt eigenem Button-Set, zeigt alle Tags

## Capabilities

### Modified Capabilities
- `meal-plan`: Umbenennung des Allergen-Felds in Nutritional Tags, Entfernung der `is_dangerous`-Beschränkung

## Impact

- **Model**: `backend/planner/models/meal_plan.py` — Feldumbenennung, Migration nötig
- **Backend Schemas**: `backend/planner/schemas/meal_plan.py` — alle `allergen_tag*` Felder umbenennen
- **Backend API**: `backend/planner/api/meal_plan.py` — Create/Update/Allergen-Scan anpassen
- **Frontend Zod**: `frontend-food/src/schemas/mealPlan.ts` — `MealPlanSchema`, `MealPlanDetailSchema`
- **Frontend Hooks**: `frontend-food/src/api/mealPlans.ts` — `useCreateMealPlan`, `useUpdateMealPlan`
- **Frontend SettingsPanel**: `frontend-food/src/pages/planning/SettingsPanel.tsx` — Vollständiger Umbau der Tag-Auswahl
- **Frontend Create Dialog**: `frontend-food/src/pages/planning/MealEventListPage.tsx` — Tag-Auswahl hinzufügen
- **Frontend RecipeSearchDialog**: `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` — `allergenTagIds` → `planTagIds`
- **Migration**: Neue Migration in der `planner` App
