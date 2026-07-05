## Why

Der Duplicate-Endpunkt `/api/meal-plans/{id}/duplicate/` scheitert mit 400, wenn der Quellplan kein `start_datetime` hat. Der aktuelle Offset-Algorithmus (alle Mahlzeiten um dieselbe Zeitspanne verschieben) ist zudem unflexibel: er verschiebt Uhrzeiten unsinnig, wenn Quell- und Zielplan verschiedene Startzeiten haben, und funktioniert nicht über DST-Grenzen hinweg.

Benötigt wird ein smarter Algorithmus: Mahlzeiten werden tageweise auf den neuen Plan gemappt (Tag 1 → Tag 1, Tag 2 → Tag 2, etc.), wobei die Uhrzeiten pro Mahlzeit exakt erhalten bleiben. Der Benutzer gibt Start- und Enddatum vor; die Tagesanzahl muss mit dem Quellplan übereinstimmen.

## What Changes

- **BREAKING**: `start_datetime` auf `MealPlan` wird von optional (`null=True`) auf required geändert. Bestehende Pläne ohne Datum bekommen beim Deploy einen Default oder werden migriert.
- **BREAKING**: `MealPlanDuplicateIn` um `end_datetime` erweitert (Pflichtfeld). Validierung: `(end - start).days` muss `(source.end - source.start).days` entsprechen.
- Algorithmus ersetzt: Statt Offset-Berechnung werden Mahlzeiten pro Tag gemappt (Tag-Index aus Quellplan → gleicher Tag-Index im neuen Plan). Uhrzeiten bleiben identisch.
- **NEU**: `MealPlanOut` um Meta-Felder `meals_copied`, `items_copied`, `overrides_copied` erweitert.
- Frontend (`frontend-food`): Duplicate-Button wird nur angezeigt, wenn Quellplan `start_datetime` und `end_datetime` hat.
- **NEU**: Create-Endpunkt erfordert `start_datetime` (Konsequenz aus required-Feld).

## Capabilities

### New Capabilities
- `meal-plan-duplicate`: Smarter Tag-basierter Duplicate-Algorithmus für MealPlans. Quellplan-Tage werden 1:1 auf Zielplan-Tage gemappt, Uhrzeiten bleiben erhalten.

### Modified Capabilities

- *(keine bestehenden Specs betroffen)*

## Impact

| Bereich | Betroffen |
|---------|-----------|
| **Backend** (`planner` App) | Model `MealPlan`: `start_datetime` wird required. API `duplicate_meal_plan`: neuer Algorithmus, erweitertes Schema. Neue Migration. |
| **Schemas** | `MealPlanDuplicateIn` + `end_datetime`, `MealPlanOut` + Meta-Felder, `MealPlanCreateIn` + required `start_datetime` |
| **Frontend** (`frontend-food`) | `useDuplicateMealPlan` Hook: erweiterter Payload. `MealEventListPage` + `MealPlanWizardPage`: Button-Sichtbarkeit, neue Felder. Zod-Schema aktualisieren. |
| **Tests** | Neuer Test `test_duplicate_meal_plan.py` für den Algorithmus. Fehlertests für Frontend. Backend: Guards (fehlendes Datum, Tagesmismatch). |
