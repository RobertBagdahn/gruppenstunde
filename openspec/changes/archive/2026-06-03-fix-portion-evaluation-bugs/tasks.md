## 1. Datenmodell & Migrationen

- [x] 1.1 `cached_weight_g` im `Recipe`-Modell in `backend/recipe/models/recipe.py` hinzufügen
- [x] 1.2 Django-Migration für das neue Feld erstellen via `uv run python manage.py makemigrations recipe`
- [x] 1.3 Migration ausführen via `uv run python manage.py migrate`

## 2. Cache-Berechnung & Backfill

- [x] 2.1 `recalculate_recipe_cache` in `backend/recipe/services/recipe_checks.py` anpassen, um `cached_weight_g` zu berechnen und zu speichern
- [x] 2.2 Den Backfill-Lauf für alle bestehenden Rezepte ausführen via `uv run python manage.py recalculate_recipe_caches`

## 3. Rezept-Regelauswertung

- [x] 3.1 `evaluate_recipe_rules` in `backend/recipe/services/recipe_checks.py` auf portionsbasierte (serving-based) Auswertung umstellen
- [x] 3.2 `match_recipe_hints` in `backend/recipe/services/recipe_checks.py` auf portionsbasierte Auswertung umstellen
- [x] 3.3 Fehlerhafte Portionsskalierung für `nutri_class` in `evaluate_recipe_rules` und `match_recipe_hints` beheben (von Skalierung ausschließen)

## 4. Cockpit- & Suggestion-Aggregation

- [x] 4.1 `_aggregate_meal_values` in `backend/recipe/services/nutrition_aggregation.py` anpassen, um portionsskalierte Nährwerte pro Person (pro Portion) zu berechnen
- [x] 4.2 Fallback-Pfad in `_aggregate_meal_values` implementieren für den Fall, dass `cached_weight_g` für ein Rezept nicht gesetzt oder None ist

## 5. Verifizierung & Tests

- [x] 5.1 Unit-Tests in `backend/recipe/tests/test_recipe_rules.py` anpassen und neue Testfälle für unterschiedliche Portions- und Gewichts-Skalierungen hinzufügen
- [x] 5.2 Testabdeckung für die neue portionsskalierte Cockpit-Aggregation erstellen (z.B. in `backend/recipe/tests/test_nutrition_aggregation.py` oder neuem Testfile)
- [x] 5.3 Alle Backend-Tests ausführen via `uv run pytest` zur finalen Qualitätssicherung
