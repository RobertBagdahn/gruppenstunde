## Why

Die Explore-Session hat drei Klassen von Problemen aufgedeckt: (1) `shopping_service` und `cost_summary` verwenden für Direktzutaten eigene, inkonsistente Gewichtsberechnungen statt des kanonischen `_resolve_ingredient_weight_g`-Helpers — bei MeasuringUnits mit `quantity > 1` (existieren in Prod) entstehen falsche Einkaufsmengen und Kosten. (2) `nutrition_summary` prefetcht `ingredient__portions` nicht, was bei Breakfast-Wizard-Mahlzeiten N+1 Queries verursacht. (3) Das Breakfast-Wizard-Getränkesystem verwendet hartcodierte kcal-Konstanten statt Rezept-Daten, was falsche Energiewerte liefert und das Konzept des rezeptbasierten Systems verletzt.

## What Changes

- **`shopping_service.generate_shopping_list`**: Direktzutat-Gewichtspfad auf `_resolve_ingredient_weight_g` refactoren — `measuring_unit.quantity` wird nicht mehr als Gewichtsfaktor missbraucht
- **`cost_summary`**: Direktzutat-Gewichtspfad ebenfalls auf `_resolve_ingredient_weight_g` refactoren — konsistent mit `nutrition_summary`
- **`nutrition_summary`**: `ingredient__portions` zum Prefetch hinzufügen, N+1 eliminieren
- **`portions=0`-Handling**: Rezepte mit `portions=0` oder `None` in allen drei Berechnungsbereichen skippen statt Division durch 1 zu normieren — **BREAKING** (vorher stilles Normieren, jetzt explizites Skippen mit Logging)
- **Getränke-System Umbau** (**BREAKING**): `DrinkState` (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson + KCAL_PER_100ML_*-Konstanten) wird durch `drinkRecipeIds: number[]` + `drinkFactors: Record<number, number>` ersetzt — analog zu `warmDishRecipeIds`/`warmDishFactors`; Getränk-Rezepte werden als MealItems im Frühstücksmeal gespeichert; kcal kommt aus Rezept-Cachedaten statt Konstanten
- **Tests**: Konsistenz-Tests für alle drei Berechnungsbereiche (nutrition, cost, shopping) für Direktzutaten mit Portionseinheiten, ml+density, N+1-Assertion, portions=0-Verhalten

## Capabilities

### New Capabilities

- `direct-ingredient-weight-resolution`: Kanonische Gewichtsberechnung für Direktzutaten in allen drei Berechnungsbereichen (nutrition, cost, shopping) über einen gemeinsamen Helper
- `breakfast-drink-recipes`: Getränke im Breakfast Wizard als Rezepte (analog warme Gerichte) statt hartcodierten Konstanten — WizardState, RefMeal-Speicherung, kcal-Berechnung

### Modified Capabilities

- `shopping-list`: Direktzutat-Gewichtspfad (`g`/`ml`/Portionseinheit) — Berechnungsformel ändert sich für Einheiten mit `quantity > 1`
- `meal-plan`: `cost_summary`-Direktzutat-Berechnung und `portions=0`-Verhalten
- `breakfast-wizard`: DrinkState-Schema und Wizard-Steps (StepGetraenke komplett neu)

## Impact

**Backend (Django):**
- `supply/services/shopping_service.py` — `generate_shopping_list`, Direktzutat-Zweig
- `planner/api/meal_plan.py` — `nutrition_summary` (Prefetch), `cost_summary` (Direktzutat-Zweig, portions=0)
- `planner/services/meal_item_helpers.py` — ggf. Erweiterung für ml+density im shopping_service
- `planner/tests/test_calculation_consistency.py` — neue Testklassen

**Frontend (React/TypeScript):**
- `frontend-food/src/schemas/breakfast.ts` — `DrinkState` Schema komplett ersetzen
- `frontend-food/src/lib/breakfastCalc.ts` — `drinksKcalPerPerson`, `totalMilkMlPerPerson`, KCAL_PER_100ML_*-Konstanten entfernen; neue `drinkKcalFromRecipes`-Funktion
- `frontend-food/src/lib/breakfastCalc.test.ts` — Drink-Tests aktualisieren
- `frontend-food/src/pages/planning/breakfast/StepGetraenke.tsx` — komplett auf Rezept-Auswahl umbauen
- `frontend-food/src/pages/planning/breakfast/useWizardState.ts` — DrinkState entfernen
- `frontend-food/src/api/breakfast.ts` — ggf. Drinks-Catalog-Endpoint anpassen

**Keine neuen Migrationen** — nur Berechnungslogik, Schemas und Tests. Der breakfast-drink Tag (`breakfast-drink`) für Rezepte existiert bereits.
