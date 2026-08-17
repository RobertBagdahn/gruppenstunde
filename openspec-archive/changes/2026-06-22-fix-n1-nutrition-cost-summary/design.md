## Context

Drei Hotspots mit N+1-Problemen:

1. **`nutrition_summary`** (`api/meal_plan.py:769`): Iteriert `meal_items` und filtert pro Item `RecipeItem.objects.filter(recipe=mi.recipe)` — ohne Prefetch.
2. **`cost_summary`** (`api/meal_plan.py:850`): Ähnliches Muster; zusätzlich werden `recipe_items` über `item.recipe.recipe_items.select_related(...)` nochmals neu abgefragt obwohl der Queryset schon geladen ist.
3. **`get_meal_plan`** (`api/meal_plan.py:234`): Prefetch deckt nicht `nutritional_tags` und `meals__items__overrides`.
4. **`nutrition_aggregation.py`**: `items = Queryset` wird 2–3× ausgewertet ohne `list()`.
5. **`MealPlanOut`**: `resolve_meals_count` ruft `.count()` auf prefetchtem Manager — umgeht Cache.

## Goals / Non-Goals

**Goals:**
- `nutrition_summary` und `cost_summary` benötigen O(1) SQL-Roundtrips statt O(n)
- `get_meal_plan` liefert alle Sub-Daten in einem Prefetch
- `nutrition_aggregation.py` wertet jeden Queryset nur einmal aus

**Non-Goals:**
- Einführung von Caching (Redis etc.)
- Komplette Umstrukturierung der Aggregations-Services

## Decisions

**D1 — Prefetch an der Quelle**
`nutrition_summary`-Queryset: `MealItem.objects.filter(meal__meal_plan=meal_plan).select_related("recipe", "meal").prefetch_related("recipe__recipe_items__portion__ingredient")`

**D2 — Meals-Count via Annotation**
```python
qs = MealPlan.objects.annotate(meals_count=Count("meals", distinct=True))
```
`resolve_meals_count` liest dann `obj.meals_count`.

**D3 — Nutritional-Tags einmalig auswerten**
```python
@staticmethod
def resolve_nutritional_tag_ids(obj):
    tags = list(obj.nutritional_tags.all())
    return [t.id for t in tags]
```
Setzt voraus, dass `nutritional_tags` prefetched ist.

**D4 — list() in nutrition_aggregation**
Jede Funktion beginnt mit `items = list(meal.recipe_items.select_related(...).all())`.

## Risks / Trade-offs

- **Speicher**: Prefetch lädt mehr Daten in den RAM. Bei sehr großen Plänen (100+ Meals) sollte das noch profiling-basiert validiert werden.
- **Abwärtskompatibilität**: Schema-Resolvers benötigen, dass der Queryset mit den richtigen Prefetches aufgebaut wird — falls ein Endpunkt den Resolver nutzt ohne korrekten Prefetch, schweigt er weiter (status quo, kein Rückschritt).
