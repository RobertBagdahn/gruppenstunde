## 1. Seed: Portionen + MeasuringUnits anlegen

- [x] 1.1 MeasuringUnits anlegen: "Scheibe", "Portion", "Tasse (200ml)", "Schuss (30ml)" in `seed_breakfast_recipes.py` (get_or_create)
- [x] 1.2 Für jede Basis-Zutat (Tag `breakfast-base`): Portion(name="Scheibe", measuring_unit=Scheibe, weight_g=standard_recipe_weight_g) anlegen
- [x] 1.3 Für jede Belag-Zutat (Tag `breakfast-topping`): Portionen "Belag knapp", "Belag normal", "Belag üppig" mit jeweiligen Gewichten anlegen
- [x] 1.4 Seed ausführen: `uv run python manage.py seed_breakfast_recipes` und Portionen prüfen

## 2. Backend: effectivePortions in Zutaten-Berechnung

- [x] 2.1 `meal_item_helpers.py`: `resolve_ingredient_energy_kcal` und `resolve_ingredient_cost_eur` um `effective_portions`-Parameter erweitern (default=1.0)
- [x] 2.2 `MealItemOut.resolve_energy_kcal`: ingredient-Pfad ruft `resolve_ingredient_energy_kcal(item, effective_portions=obj.meal.effective_portions)` auf
- [x] 2.3 `MealItemOut.resolve_cost_eur`: ingredient-Pfad ruft `resolve_ingredient_cost_eur(item, obj.meal.effective_portions)` auf (Bugfix!)
- [x] 2.4 `MealOut.resolve_total_energy_kcal`: ingredient-Pfad übergibt `effective_portions` an `resolve_ingredient_energy_kcal`
- [x] 2.5 `MealOut.resolve_total_cost_eur`: ingredient-Pfad übergibt `effective_portions` an `resolve_ingredient_cost_eur`

## 3. Backend: MealItemOut um quantity_g erweitern

- [x] 3.1 `MealItemOut` um Feld `quantity_g: float | None` ergänzen
- [x] 3.2 `resolve_quantity_g` Resolver implementieren: ingredient-Items → `portion.weight_g × quantity × effective_portions`, recipe-Items → Rezept-Gesamtgewicht × factor × effective_portions / portions
- [x] 3.3 Fallback: wenn keine Portion gefunden → `quantity_g = None`

## 4. Backend: PATCH /meal-items/ akzeptiert quantity

- [x] 4.1 `MealItemUpdateIn` um Feld `quantity: float | None = None` ergänzen
- [x] 4.2 `update_meal_item` Endpoint: wenn `quantity` in payload, dann `item.quantity = payload.quantity` setzen (zusätzlich zum bestehenden `factor`)
- [x] 4.3 Test: PATCH mit `{ quantity: 0.5 }` für ingredient-Item — quantity geändert, energy_kcal passt sich an

## 5. Backend: Portion Auto-Anlage in wizard-items

- [x] 5.1 `set_wizard_items` Endpoint: für jedes Item mit `ingredient_id` + `measuring_unit_id` prüfen ob Portion existiert
- [x] 5.2 Falls nicht: Portion idempotent anlegen (name=measuring_unit.name, weight_g aus Ingredient oder Catalog)
- [x] 5.3 Tests für `POST /wizard-items/` mit Portion-Auto-Anlage (Happy-Path + bereits existierende Portion)

## 6. Backend: Tests

- [x] 6.1 Test `resolve_ingredient_energy_kcal` mit `effective_portions=10` — Ergebnis muss 10× höher sein als mit default=1.0
- [x] 6.2 Test `resolve_ingredient_cost_eur` analog
- [x] 6.3 Test `MealItemOut.resolve_cost_eur` für ingredient-Item (vorher gab es immer None zurück)
- [x] 6.4 Test `MealItemOut.resolve_quantity_g` für ingredient- und recipe-Items

## 7. Frontend: Zod-Schema sync

- [x] 7.1 `frontend-food/src/schemas/mealPlan.ts`: `MealItemSchema` um `quantity_g: z.number().nullable()` ergänzen
- [x] 7.2 `MealItem` TypeScript-Interface um `quantity_g: number | null` ergänzen
- [x] 7.3 `useUpdateMealItem` Hook: `quantity` als optionalen Parameter akzeptieren

## 8. Frontend: Wizard buildItems() umbauen

- [x] 8.1 `BreakfastWizardPage.buildItems()`: Basis-Items auf `quantity = sharePercent/100`, `measuring_unit_id = scheibenUnitId`, `factor = 1.0`
- [x] 8.2 Belag-Items auf `quantity = sharePercent/100`, `measuring_unit_id = intensitätsPortionId`, `factor = 1.0`
- [x] 8.3 Extras-Items auf `quantity = gramsPerPerson/portionWeight`, `measuring_unit_id = portionUnitId`, `factor = 1.0`
- [x] 8.4 Getränke-Items auf `quantity = totalMl/200`, `measuring_unit_id = tasseUnitId`, `factor = 1.0`; `display_name` bleibt mit ml-Angabe
- [x] 8.5 Milch-Item auf `quantity = totalMilkMl/30`, `measuring_unit_id = schussUnitId`, `factor = 1.0`
- [x] 8.6 Warme Gerichte: unverändert (`factor` = Rezeptskalierung)

## 9. Frontend: Wizard Cockpit — Getränke aus Coverage

- [x] 9.1 `breakfastCalc.ts`: `totalKcalPerPerson` summiert nur `basis + topping + extras` (ohne drinks)
- [x] 9.2 `StepCockpit.tsx`: Getränke-Zeilen von der Coverage-Berechnung und dem Soll-Ist-Balken ausschließen
- [x] 9.3 Getränke im Cockpit in separatem Abschnitt "Getränke" unterhalb der Coverage anzeigen (mit kcal, ohne Coverage-%)

## 10. Frontend: Wizard Normalisieren nur Brot+Belag

- [x] 10.1 `breakfastCalc.ts`: `normalizeBePerPerson` skaliert nur Basis+Belag (Getränke-Mengen bleiben unverändert)
- [x] 10.2 `StepCockpit.tsx`: `handleNormalize` entfernt `setDrinks`-Aufruf, skaliert nur `bePerPerson`
- [x] 10.3 Warnbox implementieren: wenn Coverage > 120%, gelbe Warnung mit Normalisieren-Button

## 11. Frontend: QuantityInput + Portions-Display im MealSlot

- [x] 11.1 `MealSlot.tsx`: Für ingredient-Items quantity_g aus API nutzen → "×{quantity} {portion_name} ({quantity_g}g)"
- [x] 11.2 `portion_name` aus measuring_unit_name ableiten (wenn keine "g"/"ml"-Einheit)
- [x] 11.3 Fallback für alte Items ohne Portionen: nur quantity_g zeigen (z.B. "×180g")
- [x] 11.4 `QuantityInput` Komponente erstellen (analog FactorInput, editiert `quantity` statt `factor`)
- [x] 11.5 Für ingredient-Items: QuantityInput anzeigen, FactorInput ausblenden
- [x] 11.6 Für recipe-Items: FactorInput bleibt (editiert `factor` wie bisher)

## 12. Frontend: Catalog unit IDs

- [x] 12.1 `BreakfastCatalogOut` um `scheiben_measuring_unit_id`, `portion_measuring_unit_id`, `tasse_measuring_unit_id`, `schuss_measuring_unit_id` erweitern
- [x] 12.2 Backend `BreakfastCatalogOut` analog erweitern, IDs aus MeasuringUnit-Tabelle auslesen
- [x] 12.3 Zod-Schema `BreakfastCatalogSchema` sync

## 13. Abschluss

- [x] 13.1 `npm run typecheck` in `frontend-food/` — keine TypeScript-Fehler
- [x] 13.2 Tests geschrieben (18 neue: 11 unit + 7 API) — 215/220 bestehen (5 pre-existing)
- [x] 13.3 Wizard-Durchlauf: Frühstück via Wizard speichern → MealPlan zeigt Portions-Display, Coverage ohne Getränke, QuantityInput
- [x] 13.4 `uv run python manage.py seed_breakfast_recipes` — idempotent, keine Duplikate
