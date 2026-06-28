## Why

Der Frühstücksassistent ist aktuell nur aus dem RefMeal-Editor (Referenz-Mahlzeiten) erreichbar und speichert immer als RefMeal. Nutzer, die direkt im Tagesplan ein Frühstück konfigurieren wollen, müssen den Assistenten über einen separaten Weg aufrufen und das Ergebnis dann manuell mit dem Meal verknüpfen. Der Assistent soll direkt aus dem Frühstück-MealSlot heraus aufrufbar sein und das Ergebnis direkt in dieses Meal schreiben — ohne Umweg über RefMeals.

## What Changes

- Neuer "Frühstücksassistent"-Button im MealSlot für Frühstück-Mahlzeiten (neben dem existierenden "Rezept oder Zutat wählen")
- Neuer Batch-Endpoint `POST /api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/` der alle Wizard-Items atomar speichert (ersetzt existierende Items)
- Wizard-Page unterstützt einen zweiten Mode: `directMeal` (speichert direkt ins Meal) neben dem bestehenden `refMeal`-Mode
- Neue Route `/meal-plans/:id/meals/:mealId/breakfast-wizard` für den direkten Wizard-Aufruf
- Warn-Dialog vor dem Überschreiben, wenn das Ziel-Meal bereits Items enthält
- Der bestehende RefMeal-Wizard-Flow bleibt unverändert erhalten

## Capabilities

### New Capabilities

- `breakfast-wizard-direct-meal`: Wizard-Output direkt als MealItems in ein konkretes Frühstück-Meal speichern (statt als RefMeal), mit Batch-Endpoint und Überschreib-Warnung

### Modified Capabilities

- `breakfast-wizard`: Wizard unterstützt zwei Save-Modes (RefMeal und DirectMeal); Aufruf auch über `/meal-plans/:id/meals/:mealId/breakfast-wizard` möglich
- `meal-plan-frontend`: MealSlot für Frühstück-Mahlzeiten zeigt einen "Frühstücksassistent"-Button, der den Wizard im DirectMeal-Mode öffnet

## Impact

- **Backend**: Neuer API-Endpoint in `planner/api/meal_plan.py`, neue Pydantic-Schemas in `planner/schemas/meal_plan.py`
- **Frontend**: Änderungen an `MealSlot.tsx` (Button), `BreakfastWizardPage.tsx` (Save-Mode), `App.tsx` (Route), neuer API-Hook in `breakfast.ts`
- **Keine DB-Migration** nötig — keine neuen Model-Felder
