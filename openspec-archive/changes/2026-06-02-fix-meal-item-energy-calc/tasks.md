## 1. Backend: Recipe Cache-Feld

- [x] 1.1 Feld `cached_energy_total_kj` (FloatField, null=True, blank=True) zu `Recipe` in `recipe/models/` hinzufügen
- [x] 1.2 Migration erzeugen: `uv run python manage.py makemigrations recipe`
- [x] 1.3 Migration anwenden: `uv run python manage.py migrate`

## 2. Backend: Cache-Berechnung

- [x] 2.1 In `recipe/services/recipe_checks.py` (`recalculate_recipe_cache`) das Gesamtgewicht `total_weight_g = Σ RecipeItem.quantity * portion.weight_g` in der bestehenden Item-Schleife mitführen (keine zusätzliche Query)
- [x] 2.2 `cached_energy_total_kj = energy_kj_per_100g * (total_weight_g / 100.0)` setzen (None/0, wenn kein Gewicht/keine Energie)
- [x] 2.3 `"cached_energy_total_kj"` zur `update_fields`-Liste in `recalculate_recipe_cache` hinzufügen

## 3. Backend: Meal-Schema Resolver

- [x] 3.1 `MealItemOut.resolve_energy_kj` (`planner/schemas/meal_plan.py`) auf `cached_energy_total_kj * factor * (norm_portions / servings)` umstellen; `None` zurückgeben, wenn `cached_energy_total_kj` fehlt
- [x] 3.2 `MealOut.resolve_total_energy_kj` analog auf `cached_energy_total_kj` umstellen
- [x] 3.3 Prüfen, dass `cost_eur`/`total_cost_eur` unverändert auf `cached_price_total` basieren (keine Änderung)

## 4. Backend: Daten-Backfill

- [x] 4.1 Bestehenden Command `recalculate_recipe_caches` für alle Rezepte ausführen, um `cached_energy_total_kj` zu befüllen
- [x] 4.2 Stichprobe: ein bekanntes Rezept (z.B. Gulasch) prüfen — `cached_energy_total_kj` ergibt realistische kcal pro Portion

## 5. Backend: Tests

- [x] 5.1 `recipe/tests/`: Test für `recalculate_recipe_cache` — `cached_energy_total_kj` korrekt aus Gewicht × pro-100g-Energie
- [x] 5.2 `recipe/tests/`: Test für Signal-Invalidierung — `cached_energy_total_kj` aktualisiert bei RecipeItem create/update/delete
- [x] 5.3 `planner/tests/`: Test für `MealItemOut.energy_kj` und `MealOut.total_energy_kj` — realistische Totals, `None` bei fehlendem Cache
- [x] 5.4 `planner/tests/`: Konsistenztest — `MealOut.total_energy_kj` stimmt (bis auf Rundung) mit `nutrition_summary` für dieselbe Mahlzeit überein
- [x] 5.5 Tests ausführen: `uv run pytest recipe/tests planner/tests`

## 6. Frontend (frontend-food): Verifikation

- [x] 6.1 In `frontend-food/src/pages/planning/MealEventDetailPage.tsx` bestätigen, dass `energy_kj / normPortions / 4.184` und `total_energy_kj / normPortions` mit dem nun korrekten Backend-Total realistische kcal bzw. Ist-Coverage ergeben
- [x] 6.2 Zod-Schemas (`frontend-food/src/schemas/mealPlan.ts`) gegen Pydantic abgleichen — `energy_kj`/`total_energy_kj` bleiben `number`, keine Strukturänderung nötig
- [x] 6.3 Manuell prüfen: Meal-Plan-Detailseite zeigt plausible kcal-Werte und Soll/Ist-Prozente

## 7. Abschluss

- [x] 7.1 Keine `print`/`console.log`-Statements hinzugefügt; Type Hints vollständig
- [x] 7.2 `backend/AGENTS.md` um das neue Cache-Feld `cached_energy_total_kj` ergänzen
