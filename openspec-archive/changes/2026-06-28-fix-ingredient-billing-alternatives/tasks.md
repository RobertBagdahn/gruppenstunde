## 1. Backend — Nutrition API fixen

- [x] 1.1 `.exclude()` in `recipe/api/nutrition.py:103` ergänzen: Austausch-Alternativen aus der Aggregation ausschließen
- [x] 1.2 `.exclude()` in `recipe/services/recipe_checks.py:43` ergänzen (`get_recipe_nutritional_values`)
- [x] 1.3 `.exclude()` in `recipe/services/recipe_checks.py:376` ergänzen (`recalculate_recipe_cache`)

## 2. Tests schreiben

- [x] 2.1 Test: Nutrition-Breakdown-API ignoriert exchange alternatives
- [x] 2.2 Test: Nutrition-Breakdown-API inkludiert optionale Zutaten
- [x] 2.3 Test: `recalculate_recipe_cache` ignoriert exchange alternatives
- [x] 2.4 Test: `compute_variant_cost` funktioniert korrekt mit korrigiertem Cache (Delta-Logik)

## 3. Cache-Neuberechnung auslösen

- [x] 3.1 Management-Command oder Daten-Migration schreiben, um `recalculate_recipe_cache` für alle bestehenden Rezepte auszuführen (bestehendes `recalculate_recipe_caches` ruft die korrigierte Funktion auf)
