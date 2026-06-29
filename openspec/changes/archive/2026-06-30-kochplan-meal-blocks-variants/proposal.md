## Why

Der Kochplan zeigt aktuell alle Rezepte als flache, chronologische Liste — ohne erkennbare Mahlzeit-Blöcke und ohne Gruppierung von Rezept-Varianten. Wenn ein Rezept (z.B. Burger) mit mehreren Varianten (z.B. "mit Chili" / "ohne Chili") im Plan ist, erscheint es als zwei separate, nicht zusammenhängende Zeilen. Das erschwert die Lesbarkeit und Planung für Köche, die auf einen Blick sehen müssen: "Was koche ich wann, und welche Varianten gibt es?"

## What Changes

- **Backend: Meal-Blöcke in der API** — `GET /api/meal-plans/:id/cooking-schedule/` liefert eine geschachtelte Struktur: `Day → Meal → RecipeBlock → Variant → CookingScheduleItem`. Jeder RecipeBlock enthält das Rezept + seine Varianten mit `display_name` (z.B. "mit Chili", "ohne Chili").
- **Backend: Varianten-Felder ergänzen** — `variant_group_id`, `variant_display_name` und `meal_id` werden in `CookingScheduleItem` aufgenommen.
- **Backend: Zutaten-Skalierung fixen** — `_compute_scaled_ingredients` berücksichtigt `active_recipe_item_ids`, sodass Varianten nur die tatsächlich aktiven Zutaten anzeigen.
- **Backend: CookingScheduleItemOut Pydantic Schema anpassen** — neue Felder für die geschachtelte Struktur.
- **Frontend: Kochplan-Seite restrukturieren** — Weg von der flachen Tabelle hin zu Meal-Blöcken mit Recipe-Karten und Varianten-Sub-Rows.
- **Frontend: Zod Schema synchronisieren** — `CookingScheduleItemSchema` und `CookingScheduleSchema` an neue Backend-Struktur anpassen.
- **Frontend: Varianten-Namen anzeigen** — `variant_display_name` als Label pro Variante (z.B. "7× — mit Chili").

**Keine Breaking Changes**: Das Cooking-Schedule-Format wird komplett ersetzt (aktive Entwicklung, keine Rückwärtskompatibilität nötig).

## Capabilities

### New Capabilities

- `cooking-schedule-meal-blocks`: Geschachtelte Darstellung des Kochplans mit Mahlzeit-Blöcken, Recipe-Karten und Varianten-Gruppierung in der API und im UI.

## Impact

- **Backend**: `planner/services/cooking_schedule_service.py` — `build_cooking_schedule()` neu strukturieren für geschachtelte Ausgabe. `_compute_scaled_ingredients()` um Varianten-Filter erweitern. Dataclasses und Pydantic-Schemas anpassen.
- **Backend**: `planner/schemas/meal_plan.py` — neue `CookingScheduleMealOut`, `CookingScheduleRecipeBlockOut`, `CookingScheduleVariantOut` Schemas. `CookingScheduleItemOut` wird schlanker.
- **Backend**: `planner/api/meal_plan.py` — `get_cooking_schedule()` Endpunkt Response-Typ anpassen.
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` — `CookingSchedule*` Zod Schemas ersetzen.
- **Frontend**: `frontend-food/src/pages/planning/CookingSchedulePage.tsx` — komplette Restrukturierung der Rendering-Logik.
- **Frontend**: `frontend-food/src/api/mealPlans.ts` — Hook-Typen aktualisieren falls nötig.
- **Tests**: Backend-Tests in `planner/tests/test_cooking_schedule.py` an neue API-Struktur anpassen.
