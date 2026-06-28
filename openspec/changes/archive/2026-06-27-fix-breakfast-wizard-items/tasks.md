## 1. Backend: Shared energy helper

- [x] 1.1 Extrahiere die ingredient-basierte Energieberechnung aus `MealOut.resolve_total_energy_kcal` in eine Shared-Helper-Funktion (z.B. `resolve_ingredient_energy(item)` in `planner/services/meal_item_helpers.py`)
- [x] 1.2 Rufe den Shared-Helper in `MealOut.resolve_total_energy_kcal` auf (keine Logik-Duplizierung)

## 2. Backend: `MealItemOut.resolve_energy_kcal` für Ingredients

- [x] 2.1 Erweitere `MealItemOut.resolve_energy_kcal` in `planner/schemas/meal_plan.py`, um auch für ingredient-basierte Items Energie zu berechnen (nutze Shared-Helper)
- [x] 2.2 Stelle sicher, dass der Response `energy_kcal` für ingredient-basierte MealItems korrekt ausliefert
- [x] 2.3 Synchronisiere das Zod Schema `MealItemOut` in `frontend-food/src/schemas/mealPlan.ts` (bereits `z.number().nullable()` — kein Sync nötig)

## 3. Frontend: `BreakfastWizardPage` — measuring_unit_id setzen

- [x] 3.1 Ermittle die MeasuringUnit-ID für "Gramm" aus dem BreakfastCatalog (via neue Felder `gram_measuring_unit_id` / `ml_measuring_unit_id`)
- [x] 3.2 Setze in `buildItems()` für alle Zutaten-Items (Brot, Belag, Extras) `measuring_unit_id` auf die Gramm-Unit-ID + `× normPortions`
- [x] 3.3 Getränke-Items (Kaffee, Kakao, Tee, Milch) erhalten `measuring_unit_id` für "Milliliter" + `× normPortions`

## 4. Frontend: MealSlot — Zutaten-Link + Portionsanzeige

- [x] 4.1 Ersetze in `MealSlot.tsx` den `<span>` für Zutaten-Namen durch einen `<Link to={\`/ingredients/${item.ingredient_slug}\`}>` (nur wenn `ingredient_id` gesetzt ist)
- [x] 4.2 Zeige für Zutaten-Items die Portionsmenge an: `× {item.quantity} {item.measuring_unit_name}` statt `FactorInput`
- [x] 4.3 Zeige `FactorInput` nur noch für Rezept-Items an
- [x] 4.3 Portionsanzeige auch in `TableView.tsx` anwenden (analog zu MealSlot)

## 5. Tests

- [x] 5.1 Test: Wizard-Items mit `measuring_unit_id` werden korrekt gespeichert (Backend-Test für `set_wizard_items`)
- [x] 5.2 Test: `MealItemOut` liefert `energy_kcal` für ingredient-basierte Items
- [x] 5.3 Test: Zutaten-Energie wird in Meal-Summe korrekt aggregiert
- [x] 5.4 Manueller Test: Frühstücks-Wizard durchlaufen, speichern, Faktor/Portion in UI prüfen — **noch nicht durchgeführt**
