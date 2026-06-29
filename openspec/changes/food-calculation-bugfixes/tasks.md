## 1. Backend: nutrition_summary — Ingredient-MealItems einbeziehen

- [x] 1.1 In `planner/api/meal_plan.py` `nutrition_summary`: Import von `_resolve_ingredient_weight_g` aus `meal_item_helpers` hinzufügen
- [x] 1.2 Queryset um `select_related("ingredient")` und Prefetch für `ingredient`-Felder erweitern
- [x] 1.3 Das frühe `if not mi.recipe: continue` entfernen; stattdessen separaten `elif mi.ingredient:`-Zweig einfügen
- [x] 1.4 Im Ingredient-Zweig: `weight_g` via `_resolve_ingredient_weight_g(mi)` berechnen, dann `scale = weight_g / 100.0 * mi.factor * effective_portions` und alle 7 Felder akkumulieren (inkl. `per_portion_totals`)
- [x] 1.5 `nutrition_aggregation.py` ebenfalls auf Override-bewusstes Item-by-Item-Recompute umgestellt (auch `_aggregate_meal_values` nutzt jetzt Overrides)
- [x] 1.6 Tests in `planner/tests/test_calculation_consistency.py`: Nutrition-Summary mit Direktzutat (Portions-Einheit) prüft korrekten `energy_kcal`- und `per_portion_energy_kcal`-Beitrag

## 2. Backend: MealItemOverride überall

- [x] 2.1 In `nutrition_summary`-Queryset: `"overrides"` Prefetch hinzugefügt
- [x] 2.2 Im RecipeItem-Loop in `nutrition_summary`: `overrides_map` per MealItem gebaut
- [x] 2.3 Override-Check: `excluded=True` → skip; `quantity_override` → ersetzt `ri.quantity`
- [x] 2.4 Gleiche Override-Logik in `cost_summary`-RecipeItem-Loop (inkl. Prefetch)
- [x] 2.5 Override-Support in `shopping_service.generate_shopping_list` (excluded + quantity_override)
- [x] 2.6 Override-Support in `variant_service.compute_variant_energy/cost` via `_compute_total_with_overrides`
- [x] 2.7 Tests: `excluded=True` entfernt Item aus Nutrition, Cost, Shopping; `quantity_override=2` halbiert alle drei

## 3. Backend: cost_summary — recipe cost_per_person gewichtet

- [x] 3.1 `recipe_costs`-Dict um `weighted_cost_sum` und `weighted_portions_sum` erweitert
- [x] 3.2 Im Meal-Loop: Akkumulation per Mahlzeit mit `effective_portions`
- [x] 3.3 Im Output: `cost_per_person = weighted_cost_sum / weighted_portions_sum` (korrekte Gewichtung)
- [x] 3.4 Test in `test_calculation_consistency.py`: override_portions=20 → cost_per_person = cost/20

## 4. Backend: Shopping-Service — MealItemOverride-Support

- [x] 4.1 `"overrides"` Prefetch zum MealItems-Queryset in `generate_shopping_list` hinzugefügt
- [x] 4.2 Overrides-Map pro MealItem aufgebaut; `excluded=True` überspringt Zutat; `quantity_override` ersetzt `ri.quantity`
- [x] 4.3 Test in `test_calculation_consistency.py`: excluded Zutat fehlt auf Einkaufsliste; quantity_override halbiert Menge

## 5. Frontend: rebalanceShares — Largest-Remainder-Algorithmus

- [x] 5.1 `rebalanceShares` in `breakfastCalc.ts` auf Largest-Remainder-Methode umgestellt
- [x] 5.2 Algorithmus: exakte Proportionen → floor → Restwert auf Items mit größten Nachkommastellen
- [x] 5.3 Return-Typ unverändert
- [x] 5.4 Vitest eingerichtet (`vitest` installiert, `package.json` scripts, `vite.config.ts` test-config)
- [x] 5.5 27 Vitest-Tests in `src/lib/breakfastCalc.test.ts` — alle grün

## 6. Frontend: StepCockpit — Extras-Hinweis

- [x] 6.1 Info-Text in `StepCockpit.tsx` ergänzt: "Warme Gerichte und Gemüse sind nicht in der Kalorienanzeige eingerechnet."
- [x] 6.2 Nur sichtbar wenn `hasExtras` (konditionell), als muted italic Text

## 7. Konsistenz-Tests

- [x] 7.1 `planner/tests/test_calculation_consistency.py` erstellt mit 24 Tests in 4 Klassen:
  - `TestNutritionAndShoppingConsistency`: Rezept-Items, nutrition vs shopping vs MealOut
  - `TestDirectIngredientNutritionConsistency`: Direktzutaten (Breakfast-Wizard-Szenario)
  - `TestMealItemOverrideConsistency`: excluded + quantity_override in allen Bereichen
  - `TestOverridePortionsConsistency`: override_portions in nutrition, cost, shopping
- [x] 7.2 `cd backend && uv run pytest planner/ supply/ recipe/` → 617 passed, 0 failed
- [x] 7.3 `cd frontend-food && npm test` → 27 passed, 0 failed
