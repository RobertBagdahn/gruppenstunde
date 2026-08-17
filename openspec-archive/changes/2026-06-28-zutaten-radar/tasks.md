## 1. Backend — Sync erweitern

- [x] 1.1 `sync_recipe_allergen_tags` in `recipe/services/recipe_checks.py` umbenennen zu `sync_recipe_nutritional_tags` und Logik erweitern: sync ALLE Ingredient-Tags (nicht nur `is_dangerous=True`), non-dangerous manuelle Tags erhalten
- [x] 1.2 Signal-Handler in `recipe/signals.py` aktualisieren: neue Funktionsnamen, `_syncing_nutritional_tags` statt `_syncing_allergens`
- [x] 1.3 Tests für `sync_recipe_nutritional_tags` schreiben: Sync aller Tags, Erhalt manueller Tags, Sync bei verschiedenen Item-Konstellationen

## 2. Backend — Scan-Endpunkt umbenennen und erweitern

- [x] 2.1 Endpunkt `/{meal_plan_id}/allergen-scan/` umbenennen zu `/{meal_plan_id}/ingredient-scan/` in `planner/api/meal_plan.py`
- [x] 2.2 Scan-Logik erweitern: für Recipe-Items `recipe.nutritional_tags` prüfen (nach Sync), für Standalone-Ingredients `ingredient.nutritional_tags` direkt prüfen
- [x] 2.3 Schemas in `planner/schemas/meal_plan.py` prüfen: `NutritionalTagScanOut` → `IngredientScanOut` (oder Name belassen?) — Name belassen, da semantisch korrekt (scannt alle NutritionalTags)
- [x] 2.4 Tests in `planner/tests/test_meal_plan_allergens.py` umbenennen + erweitern für neue Scan-Logik

## 3. Backend — Management Command

- [x] 3.1 `recipe/management/commands/sync_recipe_allergen_tags.py` umbenennen/erweitern zu `sync_recipe_nutritional_tags` mit Backfill für alle Rezepte
- [x] 3.2 `--dry-run` Flag beibehalten, Fortschrittsanzeige

## 4. Frontend — API Hooks umbenennen

- [x] 4.1 `src/api/mealPlans.ts`: `useAllergenScan` → `useIngredientScan`, Query-Key `'meal-plan-allergen-scan'` → `'meal-plan-ingredient-scan'`
- [x] 4.2 Frontend Zod-Schemas in `src/schemas/mealPlan.ts` prüfen: `NutritionalTagScanResponseSchema` → ggf. umbenennen (Name belassen, semantisch korrekt)

## 5. Frontend — Komponenten umbenennen

- [x] 5.1 `src/pages/planning/AllergenScanView.tsx` → `IngredientScanView.tsx`, alle Imports und Labels aktualisieren
- [x] 5.2 `src/components/recipe/AllergenIndicator.tsx` → `NutriTagIndicator.tsx`, UI-Text "Allergenhinweise" → "Ernährungstags"
- [x] 5.3 `src/components/shared/AllergenWarningBadge.tsx` → `NutriTagBadge.tsx`
- [x] 5.4 Importe in allen Consumer-Dateien aktualisieren: `MealSlot.tsx`, `ShoppingView.tsx`, `NutritionView.tsx`, `TableView.tsx`, `CostDashboard.tsx`

## 6. Frontend — UI-Texte

- [x] 6.1 Alle sichtbaren Texte von "Allergene Radar" → "Zutaten-Radar" ändern
- [x] 6.2 "Ernährungs-Check" und ähnliche Labels auf neuen Namen prüfen

## 7. Tests & Qualität

- [x] 7.1 Backend-Tests ausführen: `uv run pytest planner/tests/test_meal_plan_ingredient_scan.py recipe/tests/test_recipe_nutritional_sync.py -xvs`
- [x] 7.2 Backfill-Befehl auf bestehenden Rezepten testen: `uv run python manage.py sync_recipe_nutritional_tags --dry-run`
- [x] 7.3 Frontend-Typecheck: `cd frontend-food && npx tsc --noEmit`
- [ ] 7.4 Manuellen Smoke-Test: MealPlan öffnen, Zutaten-Radar prüfen
