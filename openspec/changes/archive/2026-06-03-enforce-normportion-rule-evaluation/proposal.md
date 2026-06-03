## Why

Rezept-, Mahlzeit-, Tages- und Planregeln werten Nährwerte aktuell uneinheitlich aus: Manche Pfade dividieren durch `recipe.servings`, manche skalieren auf Gruppenmengen (`norm_portions`, `activity_factor`, `reserve_factor`), und die archivierte Norm `recipe-portion-normalization` (jedes Rezept = 1 Normportion) wird nicht durchgehend respektiert. Das führt zu widersprüchlichen Ampelbewertungen je nach Kontext. Wir legen eine einzige, klare Bewertungsbasis fest: **Alle Rezepte sind genau eine Normportion, und jede Regel- und Aggregationslogik rechnet ausschließlich in Normportionen. Reale Mengenskalierung passiert erst im Einkaufszettel.**

## What Changes

- **BREAKING**: Jede Rezept-Bewertung wertet exakt eine Normportion aus. Die Division durch `recipe.servings` (Faktor `(total_weight_g / 100) / servings`) entfällt vollständig in `evaluate_recipe_rules` und `match_recipe_hints`.
- **BREAKING**: Die Cockpit-/Suggestion-Aggregation (`_aggregate_meal_values`, Tages- und Planaggregation) entfernt die `servings`-Division und die `price_scale = 1/servings`-Logik. Mahlzeitwerte = Summe der Rezept-Normportionwerte × `MealItem.factor`.
- `MealItem.factor` bleibt die einzige fachliche Skalierung innerhalb der Regelbewertung (Anteil eines Rezepts an einer Mahlzeit), nicht für Personen-/Gruppenmengen.
- Personen-, Aktivitäts- und Reserve-Skalierung (`norm_portions`, `activity_factor`, `reserve_factor`, `override_portions`, `day_part_factor`) wird aus allen Regel-/Cockpit-/Suggestion-Pfaden entfernt; sie bleibt ausschließlich im Einkaufszettel und in den expliziten Mengen-/Kosten-Endpunkten.
- `cached_weight_g` und `cached_price_total` werden semantisch klar als **Werte je Normportion** definiert (da `servings` immer 1 ist, ändert sich die Berechnung nicht, aber die Bedeutung wird festgeschrieben).
- Plan-Scope-Regeln (`meal_event`) bewerten Durchschnitt/Summe über Tage in Normportion-Logik, ohne Division durch reale Personenzahl.
- Tests, die Rezepte mit `servings > 1` anlegen, werden auf `servings = 1` umgestellt und die erwarteten Bewertungswerte entsprechend angepasst.

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities. -->

### Modified Capabilities

- `recipe-rules-display`: Rezeptregeln werten genau eine Normportion aus; keine `servings`-Division mehr. `weight_g` und `price_total` werden als Normportionwerte bewertet und angezeigt.
- `meal-cockpit`: Mahlzeit-, Tages- und Planaggregation rechnet in Normportionen; Beitrag je Rezept = Normportionwert × `MealItem.factor`, ohne `servings`- oder Gruppen-Skalierung.
- `meal-plan-suggestions`: Suggestion-Auswertung nutzt Normportion-Aggregate; keine Personen-/Aktivitäts-/Reserve-Skalierung in der Regelbewertung.

## Impact

- **Backend (`recipe` App)**:
  - `recipe/services/recipe_checks.py` — `evaluate_recipe_rules`, `match_recipe_hints`: `servings`-Faktor entfernen.
  - `recipe/services/nutrition_aggregation.py` — `_aggregate_meal_values`, `_aggregate_day_values`, `_aggregate_meal_plan_values`: `nutrient_scale`/`price_scale` über `servings` entfernen; Beitrag = Normportionwert × `item.factor`.
- **Backend (`recipe` App, Suggestions)**:
  - `recipe/services/suggestion_service.py` — sicherstellen, dass keine zusätzliche Personen-/Tages-Skalierung in der Regelbewertung steckt (nur Normportion-Aggregate). `meal_event`-Regeln: Durchschnitt über Tage ohne Personen-Division prüfen.
- **APIs/Schemas**: Regel-/Suggestion-Antwortschemas (Pydantic/Zod) bleiben strukturell unverändert; nur berechnete Werte ändern sich. Kein Zod-Sync nötig, sofern keine Felder ergänzt werden.
- **Tests**: `recipe/tests/test_recipe_rules.py`, `recipe/tests/test_nutrition_aggregation.py` und betroffene Suggestion-Tests auf `servings = 1` und Normportion-Erwartungen umstellen.
- **Datenbank**: Keine neue Migration nötig (`cached_weight_g` existiert bereits); nur Bedeutungsfestlegung. Optional Backfill via `recalculate_recipe_caches`, falls Werte fehlen.
- **Abgrenzung**: Einkaufszettel-, Mengen- und Kosten-Endpunkte (`planner/api/meal_plan.py`, `planner/schemas/meal_plan.py`, shopping App) bleiben bewusst unverändert — dort findet die reale Mengenskalierung weiterhin statt.
