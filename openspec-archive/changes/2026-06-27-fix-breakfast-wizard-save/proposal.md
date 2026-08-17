## Why

Der Frühstücks-Wizard erlaubt die vollständige Konfiguration eines Frühstücks (Basis, Belag, Extras, Getränke), aber beim Klick auf "Frühstück speichern" werden die Items nicht im RefMeal persistiert. Der POST-Endpunkt ignoriert die `items` im Request-Body, weil `RefMealCreateIn` kein `items`-Feld definiert. Zusätzlich werden Getränke gar nicht gemappt und der Redirect führt an eine unpassende Stelle.

## What Changes

- **Backend**: `RefMealCreateIn` um optionales `items`-Feld erweitern, `create_ref_meal`-Handler erstellt MealItems bei vorhandenen `items`
- **Frontend**: `handleSave()` in `BreakfastWizardPage` mappt Getränke (`state.drinks`) als MealItems, Redirect auf den RefMeal-Editor statt Plan-Übersicht

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities — dies ist ein Bugfix für bestehende Features -->

### Modified Capabilities
- `ref-meal`: `RefMealCreateIn` akzeptiert jetzt optional `items` bei der Erstellung — RefMeals können in einem Request mit Items angelegt werden
- `breakfast-wizard`: Getränke werden beim Speichern als MealItems persistiert; Redirect nach Save geht zum RefMeal-Editor

## Impact

- **Backend**: `planner/schemas/meal_plan.py` (RefMealCreateIn), `planner/api/ref_meal.py` (create_ref_meal Handler)
- **Migrations**: Keine — nur Schema-Änderung, kein Datenmodell
- **Frontend**: `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` (handleSave + Redirect)
- **Tests**: `planner/tests/test_ref_meal.py` — Test für POST mit `items` ergänzen
- **Keine Breaking Changes**: `items` ist optional, bestehende POST-Requests ohne `items` funktionieren unverändert
