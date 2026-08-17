## 1. Rezept-Regelauswertung auf Normportion umstellen

- [x] 1.1 In `backend/recipe/services/recipe_checks.py` in `evaluate_recipe_rules` den Faktor von `(total_weight_g / 100.0) / servings` auf `total_weight_g / 100.0` ändern und die `servings`-Variable entfernen
- [x] 1.2 In `backend/recipe/services/recipe_checks.py` in `match_recipe_hints` denselben Faktor auf `total_weight_g / 100.0` umstellen und `servings` entfernen
- [x] 1.3 Sicherstellen, dass `nutri_class` und `weight_g` weiterhin unskaliert bleiben

## 2. Cockpit-/Mahlzeit-Aggregation auf Normportion umstellen

- [x] 2.1 In `backend/recipe/services/nutrition_aggregation.py` in `_aggregate_meal_values` (Cache-Pfad) `nutrient_scale` von `(total_weight_g / 100.0) / servings` auf `total_weight_g / 100.0` ändern
- [x] 2.2 `price_scale = 1.0 / servings` entfernen; Preisbeitrag auf `float(recipe.cached_price_total or 0) * item.factor` umstellen
- [x] 2.3 Denselben Umbau im Fallback-Pfad (`get_recipe_values_with_computed`) von `_aggregate_meal_values` durchführen
- [x] 2.4 Die `servings`-Variable aus `_aggregate_meal_values` entfernen

## 3. Suggestion-Service verifizieren

- [x] 3.1 In `backend/recipe/services/suggestion_service.py` prüfen, dass `_evaluate_admin_rules` für `meal_event` nur die Tagesmittelung (`/ num_days`) nutzt und keine `norm_portions`-/Personen-Division enthält
- [x] 3.2 Sicherstellen, dass `_aggregate_*`-Aufrufe ausschließlich Normportion-Aggregate liefern (keine zusätzliche Skalierung)

## 4. Tests anpassen

- [x] 4.1 In `backend/recipe/tests/test_recipe_rules.py` alle `make_recipe(servings=...)`-Aufrufe auf `servings=1` umstellen und erwartete Normportion-Werte anpassen
- [x] 4.2 In `backend/recipe/tests/test_nutrition_aggregation.py` `servings`-basierte Erwartungen auf Normportion × `factor` umstellen
- [x] 4.3 Neuen Testfall ergänzen: Mahlzeit mit zwei Rezepten unterschiedlicher `MealItem.factor`-Werte aggregiert korrekt in Normportion-Logik
- [x] 4.4 Neuen Testfall ergänzen: `norm_portions`/`activity_factor`/`reserve_factor` beeinflussen die Regelbewertung NICHT
- [x] 4.5 Plan-/Tagesdurchschnitt-Test ergänzen: `meal_event`-Regel nutzt Tagesmittel ohne Personen-Division

## 5. Verifizierung

- [x] 5.1 Alle Backend-Tests ausführen via `uv run pytest`
- [x] 5.2 Sicherstellen, dass keine `print`-Statements oder `/ servings`-Divisionen in den geänderten Regel-/Aggregationspfaden verbleiben
