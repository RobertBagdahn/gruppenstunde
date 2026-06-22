## 1. get_meal_plan: Prefetch vervollständigen

- [x] 1.1 `api/meal_plan.py:234`: `prefetch_related(...)` um `"nutritional_tags"` und `"meals__items__overrides"` erweitern
- [x] 1.2 `schemas/meal_plan.py:83-86`: `resolve_overrides` — Silent-`[]`-Fallback entfernen; immer `list(obj.overrides.all())` zurückgeben (funktioniert wenn prefetched)

## 2. nutrition_summary: N+1 eliminieren

- [x] 2.1 `api/meal_plan.py:748`: `meal_items_qs` mit `prefetch_related("recipe__recipe_items__portion__ingredient")` ausstatten
- [x] 2.2 `nutrition_aggregation.py`: In `_aggregate_meal_values` `items = list(meal.recipe_items...)` am Anfang — Queryset nicht mehrfach auswerten
- [x] 2.3 `nutrition_aggregation.py:84-88`: `nutri_classes`-Loop auf die bereits geladene `items`-Liste aufbauen (nicht nochmals `.all()`)

## 3. cost_summary: N+1 eliminieren

- [x] 3.1 `api/meal_plan.py:821`: Queryset für Meals mit `prefetch_related("items__recipe__recipe_items__portion__ingredient")` ausstatten
- [x] 3.2 `api/meal_plan.py:850`: `item.recipe.recipe_items.select_related(...)` — durch prefetchte Relation ersetzen; kein Extra-Query mehr
- [x] 3.3 Standalone-Ingredient-Gewichtsformel (`api/meal_plan.py:886-913`) überprüfen: sicherstellen dass `effective_portions` nicht doppelt multipliziert wird

## 4. MealPlanOut: Count-Queries ersetzen

- [x] 4.1 `list_meal_plans`-Queryset (`api/meal_plan.py:122`): `annotate(meals_count=Count("meals", distinct=True))` hinzufügen
- [x] 4.2 `schemas/meal_plan.py:219`: `resolve_meals_count` → `return obj.meals_count` (aus Annotation)
- [x] 4.3 `list_meal_plans`-Queryset: `prefetch_related("nutritional_tags")` hinzufügen
- [x] 4.4 `schemas/meal_plan.py:229-234`: `resolve_nutritional_tag_ids` und `resolve_nutritional_tag_names` auf gemeinsame einmalige Auswertung umstellen

## 5. quality_score.py: Queryset-Mehrfachauswertung beheben

- [x] 5.1 `recipe/services/quality_score.py:24`: `items = list(recipe.recipe_items.select_related("portion", "portion__ingredient").all())` — einmal auswerten
- [x] 5.2 Alle weiteren `items.exists()` und `for item in items` nutzen dann die gecachte Liste

## 6. Tests

- [x] 6.1 Backend-Test: `nutrition_summary` für Plan mit 20 Mahlzeiten — SQL-Query-Count ≤ 5
- [x] 6.2 Backend-Test: `cost_summary` für Plan mit 20 Mahlzeiten — SQL-Query-Count ≤ 5
