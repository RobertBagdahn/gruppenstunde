## 1. Backend: _resolve_ingredient_weight_g in shopping_service

- [x] 1.1 In `supply/services/shopping_service.py` den Import von `_resolve_ingredient_weight_g` aus `planner.services.meal_item_helpers` hinzufügen
- [x] 1.2 Im Direktzutat-Zweig von `generate_shopping_list` (Zeilen ~210-231): `portion_weight`-Inline-Logik entfernen und durch `_resolve_ingredient_weight_g(mi)` ersetzen — Rückgabe ist Basisgewicht, Skalierung mit `meal_scaling` bleibt im Aufrufer
- [x] 1.3 Prüfen ob `_resolve_ingredient_weight_g` den `portion_lookup`-Cache des Shopping Service nutzen kann (Open Question aus design.md) — falls nein: sicherstellen dass kein N+1 durch internen Portions-Lookup entsteht (ggf. `ingredient.portions.all()` bereits durch bestehenden Prefetch abgedeckt)
- [x] 1.4 `portion_lookup`-Batch-Load im Shopping Service um `ingredient__portions` erweitern falls nötig

## 2. Backend: _resolve_ingredient_weight_g in cost_summary

- [x] 2.1 In `planner/api/meal_plan.py` den Import von `_resolve_ingredient_weight_g` aus `meal_item_helpers` hinzufügen (analog zu `nutrition_summary`)
- [x] 2.2 Im Direktzutat-Zweig von `cost_summary` (Zeilen ~1289-1319): `portion_weight`-Inline-Logik entfernen und durch `_resolve_ingredient_weight_g(item)` ersetzen
- [x] 2.3 Prefetch für `"items__ingredient__measuring_unit"` und `"items__ingredient__portions"` zu `cost_summary`-Query hinzufügen (damit Helper keine N+1-Queries macht)

## 3. Backend: N+1 Fix in nutrition_summary

- [x] 3.1 In `nutrition_summary`-Queryset: `"ingredient__portions"` zum `prefetch_related`-Chain hinzufügen (nach `"ingredient", "measuring_unit"`)

## 4. Backend: portions=0 skippen

- [x] 4.1 In `nutrition_summary`: nach `recipe_servings = mi.recipe.portions or 1` prüfen ob `mi.recipe.portions` 0 oder None ist — falls ja: `logger.warning(f"Recipe {mi.recipe.id} '{mi.recipe.title}' has portions=0, skipping")` und `continue`
- [x] 4.2 In `cost_summary`: analog — `recipe_servings = item.recipe.portions or 1` durch expliziten Check + Warning + continue ersetzen
- [x] 4.3 In `shopping_service.generate_shopping_list`: analog — `recipe_servings = getattr(recipe, "portions", 1) or 1` durch expliziten Check + Warning + continue ersetzen

## 5. Backend: Konsistenz-Tests (test_calculation_consistency.py erweitern)

- [x] 5.1 Testklasse `TestDirectIngredientWeightConsistency` hinzufügen:
  - Direktzutat g-Einheit: shopping `total_quantity_g` = `quantity * factor * scaling_factor`
  - Direktzutat Portionseinheit: alle drei Bereiche (nutrition, cost, shopping) liefern konsistentes `weight_g`
  - Direktzutat ml + density: nutrition und cost sind identisch
- [x] 5.2 Testklasse `TestPortionsZeroSkip` hinzufügen:
  - Rezept mit `portions=0` → nutrition_summary: `energy_kcal = 0`
  - Rezept mit `portions=0` → cost_summary: kein Beitrag zu `total_cost`
  - Rezept mit `portions=0` → shopping: keine Zutaten in Liste
- [x] 5.3 Test `TestNutritionSummaryNoNPlusOne` mit `django.test.utils.CaptureQueriesContext` oder `assertNumQueries`:
  - 10 Direktzutaten in einer Mahlzeit → Queryanzahl ist konstant (kein N+1)
- [x] 5.4 Test `TestCostSummaryDirectIngredientConsistency`:
  - Direktzutat mit ml + density: `cost_summary.weight_g == nutrition_summary.weight_g` (indirekt via Preisberechnung)

## 6. Frontend: DrinkState-Schema entfernen

- [x] 6.1 In `frontend-food/src/schemas/breakfast.ts`: `DrinkState`-Schema entfernen (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson)
- [x] 6.2 In `WizardStateSchema`: `drinks`-Feld entfernen, stattdessen `drinkRecipeIds: z.array(z.number()).default([])` und `drinkFactors: z.record(z.coerce.string(), z.number()).default({})` hinzufügen

## 7. Frontend: breakfastCalc.ts — Drink-Funktionen entfernen und ersetzen

- [x] 7.1 Konstanten `KCAL_PER_100ML_COFFEE`, `KCAL_PER_100ML_COCOA`, `KCAL_PER_100ML_TEA`, `KCAL_PER_100ML_MILK` entfernen
- [x] 7.2 Funktionen `drinksKcalPerPerson` und `totalMilkMlPerPerson` entfernen
- [x] 7.3 Neue Funktion `drinkKcalFromRecipes(state: WizardState, recipeDataMap: Map<number, {cached_energy_kcal: number | null, portions: number | null}>): number` implementieren — analog zu `extrasKcalPerPerson` aber mit echten Rezept-Daten
- [x] 7.4 `totalKcalPerPerson` aktualisieren: `extras` durch `drinks + extras` ersetzen (beide aus Rezept-Daten)
- [x] 7.5 Tests in `breakfastCalc.test.ts`: `drinksKcalPerPerson`- und `totalMilkMlPerPerson`-Tests entfernen, neue Tests für `drinkKcalFromRecipes` hinzufügen

## 8. Frontend: useWizardState — DrinkState entfernen

- [x] 8.1 In `frontend-food/src/pages/planning/breakfast/useWizardState.ts`: `drinks`-Initial-State entfernen, `drinkRecipeIds`/`drinkFactors` hinzufügen
- [x] 8.2 `addDrinkRecipe(recipeId: number)` und `removeDrinkRecipe(recipeId: number)` Actions hinzufügen
- [x] 8.3 In `refMealToWizardState.ts`: Getränke-MealItems aus RefMeal-Daten in `drinkRecipeIds`/`drinkFactors` laden (analog zu warmDishRecipeIds)

## 9. Frontend: StepGetraenke auf Rezept-Auswahl umbauen

- [x] 9.1 `StepGetraenke.tsx` vollständig umbauen: Slider-UI entfernen, stattdessen Rezept-Kacheln aus `useBreakfastCatalog().drinks` anzeigen
- [x] 9.2 Toggle-Logik: Klick auf Rezept-Kachel → `addDrinkRecipe`/`removeDrinkRecipe` aus useWizardState
- [x] 9.3 Ausgewählte Rezepte visuell hervorheben (Checkmark-Overlay oder Border)
- [x] 9.4 Optional: Factor-Eingabe pro Getränk (analog StepExtras — implementiert)

## 10. Frontend: StepCockpit — kcal-Anzeige für Getränke

- [x] 10.1 In `StepCockpit.tsx`: Getränke-kcal aus `drinkKcalFromRecipes` statt `drinksKcalPerPerson` berechnen
- [x] 10.2 Benötigte Rezept-Daten für Getränke (cached_energy_kcal, portions) in StepCockpit verfügbar machen — aus catalog.drink_recipes Map aufgebaut

## 11. Frontend: Wizard-Save — Getränke als MealItems speichern

- [x] 11.1 In `BreakfastWizardPage.tsx` (oder `useWizardState`-Save-Logik): `drinkRecipeIds` beim Save in `WizardItemsIn`-Payload aufnehmen — analog zur Behandlung von `warmDishRecipeIds`
- [x] 11.2 Sicherstellen dass Getränke-MealItems mit korrektem `factor` aus `drinkFactors` gespeichert werden

## 12. TypeScript Build und Tests

- [x] 12.1 `cd frontend-food && npx tsc --noEmit` — keine TypeScript-Fehler in geänderten Dateien (pre-existing Fehler in MealSlot/RefMealEditorPage/TableView unverändert)
- [x] 12.2 `cd frontend-food && npm test` — 30 Vitest-Tests grün
- [x] 12.3 `cd backend && uv run pytest planner/ supply/ recipe/ -x` — 657 Tests grün
