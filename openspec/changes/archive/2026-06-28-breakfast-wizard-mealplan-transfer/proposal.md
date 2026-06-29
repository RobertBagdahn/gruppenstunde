## Why

Nach dem Übertragen aus dem Frühstücksassistenten in den MealPlan ist die Darstellung verwirrend und inkonsistent. Jedes Item zeigt `×18g ×10,00` — zwei separate Skalierungsfaktoren, die semantisch zusammengehören. Der `factor=normPortions` ist zudem editierbar, obwohl er vom Wizard festgelegt wurde. Zutaten-Items (Brot, Belag) zeigen keine Kosten an, weil `MealItemOut.resolve_cost_eur` NUR Rezept-Items behandelt.

Architektonisch ist der Pfad für Zutaten-Items inkonsistent zu Rezept-Items: Rezepte rechnen `× effectivePortions` im Backend, Zutaten müssen `factor` dafür missbrauchen.

## What Changes

- **BREAKING**: `resolve_ingredient_energy_kcal()` und `resolve_ingredient_cost_eur()` multiplizieren mit `effectivePortions` — wie Rezept-Items auch
- **BREAKING**: Wizard `buildItems()` speichert `quantity = sharePercent/100` (reiner Pro-Person-Anteil), `factor = 1.0`
- **BREAKING**: Wizard speichert Zutaten mit portions-basierten `measuring_unit` statt rohem "g" (z.B. "Scheibe", "Portion", "Tasse (200ml)", "Schuss (30ml)")
- Seed erstellt Portionen für alle Basis- und Belag-Zutaten
- `POST /wizard-items/` legt fehlende Portionen automatisch an (idempotent)
- `MealItemOut` bekommt `quantity_g` (Portions-Gesamtgewicht) für Portions-Display
- `MealItemOut.resolve_cost_eur` behandelt ingredient-Items (Bugfix)
- Wizard-Cockpit: Getränke-Kcal aus Frühstücks-Coverage herausrechnen, Normalisieren nur für Brot+Belag
- MealPlan-Anzeige: `×1,4 Scheiben (25g)` statt `×18g ×10,00`

## Capabilities

### New Capabilities
- `meal-plan-ingredient-calcs`: Backend-Energie-/Kostenberechnung für Zutaten-Items mit effectivePortions (konsistent zu Rezept-Items)

### Modified Capabilities
- `breakfast-wizard`: Wizard speichert pro Person ohne normPortions, verwendet Portions-Einheiten, Getränke von Coverage getrennt, Normalisieren nur Brot+Belag
- `breakfast-seed-recipes`: Seed erstellt zusätzlich Portionen für Basis-/Belag-Zutaten

## Impact

- **Backend**: `planner/schemas/meal_plan.py` (MealItemOut, MealOut), `planner/services/meal_item_helpers.py` (resolve_ingredient_energy_kcal, resolve_ingredient_cost_eur), `planner/api/meal_plan.py` (set_wizard_items), `planner/api/ref_meal.py` (create/update RefMeal)
- **Backend Seed**: `recipe/management/commands/seed_breakfast_recipes.py` (Portionen anlegen)
- **Frontend Wizard**: `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` (buildItems), `StepCockpit.tsx` (Coverage ohne Getränke, Normalisieren nur Brot+Belag)
- **Frontend Display**: `frontend-food/src/pages/planning/MealSlot.tsx` (Portions-Display), `frontend-food/src/schemas/mealPlan.ts` (MealItemSchema um quantity_g)
- **Frontend API**: `frontend-food/src/api/mealPlans.ts` (Schema-Update)
- **DB Migration**: Keine (kein neues Feld, nur Berechnungslogik)
