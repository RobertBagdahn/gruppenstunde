## Why

Die API-Endpunkte `nutrition_summary` und `cost_summary` im MealPlan feuern unkontrolliert N+1-Datenbankabfragen: für jeden `MealItem` wird `RecipeItem`-Queryset einzeln ausgeführt. Bei einem Plan mit 50 Mahlzeiten × 5 Items = 250 zusätzliche SQL-Statements pro API-Aufruf. Dasselbe Problem existiert im `get_meal_plan`-Endpunkt für `nutritional_tags` und `overrides`. Der `nutrition_summary`-Service (`nutrition_aggregation.py`) evaluiert denselben Queryset dreimal ohne `list()`.

## What Changes

- `nutrition_summary`-Endpunkt: Queryset mit `prefetch_related("recipe__recipe_items__portion__ingredient")` vorbereiten statt pro Item zu filtern
- `cost_summary`-Endpunkt: gleiche Prefetch-Strategie; standalone-Ingredient-Gewichtsformel überprüfen
- `get_meal_plan`-Endpunkt: `nutritional_tags` und `meals__items__overrides` in Prefetch aufnehmen
- `resolve_meals_count` in `MealPlanOut`: `obj.meals.count()` → `len(prefetched)` oder Queryset-Annotation
- `resolve_nutritional_tag_ids` / `resolve_nutritional_tag_names`: einmalige Auswertung statt 2× `.all()`
- `nutrition_aggregation.py`: `items = list(...)` am Anfang jeder Aggregationsfunktion

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Backend**: `backend/planner/api/meal_plan.py`, `backend/planner/schemas/meal_plan.py`, `backend/recipe/services/nutrition_aggregation.py`
- **Keine Frontend-Änderungen**, keine Migrationen
