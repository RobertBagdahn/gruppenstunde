## Why

Aktuell sind die Faktoren zur Gewichtung von Mahlzeiten (`day_part_factors`) global im System fest verdrahtet, und es ist nicht möglich, einzelne Mahlzeiten als "extern" zu markieren oder deren Kalorien manuell zu erfassen. Dies schränkt die Flexibilität bei der Essensplanung auf Lagern ein, wenn Gruppen bspw. auswärts essen, aber die Kalorien für den Tag trotzdem korrekt in der Tagesbilanz berücksichtigt werden sollen.

## What Changes

- **Konfigurierbare day_part_factors**: Hinzufügen eines editierbaren JSON-Felds `day_part_factors` zum `MealPlan` Model, um die prozentuale Gewichtung von Frühstück, Mittag, Abend, Snack und Nachtisch pro Plan anpassen zu können.
- **Externe Mahlzeiten**: Hinzufügen der Felder `is_external` (Boolean) und `external_energy_kcal` (Float) zum `Meal` Model.
- **Neutrales Soll/Ist für externe Mahlzeiten**: Wenn eine Mahlzeit als "extern" markiert ist, wird ihr Soll-Wert in der Bewertung automatisch dem Ist-Wert gleichgesetzt (100% / neutral), so dass keine Ampel-Warnungen ausgelöst werden.
- **Tagesenergie-Kalkulation**: Der manuell eingegebene Ist-Wert (`external_energy_kcal`) einer externen Mahlzeit wird zu den Ist-Kalorien des jeweiligen Tages addiert.

## Capabilities

### New Capabilities
*(Keine neuen Capabilities nötig)*

### Modified Capabilities
- `meal-plan`: Anpassung des Datenmodells, der Berechnungen im Nährstoff-Cockpit sowie der Konfigurationsoberfläche im Frontend.

## Impact

- **Backend**:
  - Models: `MealPlan` (neues JSONField `day_part_factors`), `Meal` (neue Felder `is_external`, `external_energy_kcal`).
  - Schemas: Anpassung von `MealPlanIn`, `MealPlanOut`, `MealOut`, `MealUpdateIn` in `backend/planner/schemas/meal_plan.py`.
  - Logik: Anpassung von `_evaluate_rules` und Cockpit-Berechnung in `backend/recipe/services/nutrition_aggregation.py` zur neutralen Soll/Ist-Gleichschaltung und Berücksichtigung der externen Kalorien im Tagessaldo.
- **Frontend**:
  - Schemas: Sync der Zod-Modelle `MealPlanSchema`, `MealSchema` in `frontend-food/src/schemas/mealPlan.ts`.
  - Components/Pages:
    - `SettingsPanel`: Eingabefelder für `day_part_factors` (z.B. Frühstück %, Mittagessen %, etc.).
    - `MealSlot` / `MealItemEditor`: Checkbox für "Externe Mahlzeit" und Eingabefeld für "Externe Kalorien (kcal)".
