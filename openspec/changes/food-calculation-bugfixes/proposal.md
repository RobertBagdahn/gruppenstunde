## Why

Die Explore-Phase hat mehrere Berechnungsfehler im Food-Bereich aufgedeckt: Nährwerte für direkte Zutaten werden in der Nutrition-Summary-API vollständig ignoriert, `MealItemOverride` ist trotz vorhandenem Modell nie in Berechnungen eingebunden, und der Breakfast-Wizard hat ein Rundungsartefakt sowie einen ungeklärten Milch-Doppelzählungs-Fall. Diese Fehler führen zu falsch angezeigten Kalorienmengen, falschen Einkaufsmengen und falsch berechneten Kosten-pro-Person. Da Essensplanung für Lager-Kontexte safety-relevant ist, müssen diese Fehler behoben werden.

## What Changes

- **Backend `nutrition_summary`-API**: Ingredient-MealItems (direkte Zutaten, z.B. vom Breakfast-Wizard) werden korrekt in Nährwert-Aggregation einbezogen
- **Backend `cost_summary`-API**: `cost_per_person` pro Rezept wird durch `effective_portions` der jeweiligen Mahlzeit geteilt, nicht global durch `norm_portions`
- **Backend `MealItemOverride`**: `excluded`- und `quantity_override`-Felder werden in `nutrition_summary` und `cost_summary` ausgewertet
- **Backend `shopping_service`**: Bug bei Direktzutaten mit `g`-Einheit behoben — `measuring_unit.quantity` durch `mi.quantity` ersetzt
- **Frontend `breakfastCalc.ts`**: `rebalanceShares` erhält Largest-Remainder-Algorithmus um Rundungsartefakte (Summe ≠ 100) zu vermeiden
- **Frontend `breakfastCalc.ts`**: `extrasKcalPerPerson` gibt weiterhin 0 zurück, aber UI zeigt expliziten Hinweis
- **Tests**: Fehlende Tests für alle behobenen Berechnungen werden hinzugefügt

## Capabilities

### New Capabilities

- `nutrition-summary-ingredients`: Ingredient-MealItems in Nährwert-Aggregation der `nutrition-summary`-API
- `meal-item-override-calc`: `MealItemOverride.excluded` und `quantity_override` in Nährwert- und Kostenberechnungen auswerten
- `breakfast-calc-fixes`: `rebalanceShares` Largest-Remainder + UI-Hinweis für Extras-Kalorien

### Modified Capabilities

- `shopping-list`: Bug-Fix bei Direktzutat mit g-Einheit (`measuring_unit.quantity` → `mi.quantity`)
- `meal-plan`: `cost_per_person` pro Rezept im Cost-Summary nutzt `effective_portions` statt globalem `norm_portions`

## Impact

**Backend (Django):**
- `planner/api/meal_plan.py` — `nutrition_summary`, `cost_summary`
- `supply/services/shopping_service.py` — `generate_shopping_list`, Direktzutat-Zweig
- `planner/tests/` — neue Tests für alle Fixes

**Frontend (React/TypeScript):**
- `frontend-food/src/lib/breakfastCalc.ts` — `rebalanceShares`
- `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` — Extras-Hinweis
- `frontend-food/src/lib/breakfastCalc.test.ts` — neue Unit-Tests

**Keine Migrations nötig** — nur Berechnungslogik und Tests.
