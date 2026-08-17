## Why

Die `effective_portions`-Logik in Backend (`Meal.effective_portions`) und Frontend (`effectivePortions()` in `schemas/mealPlan.ts`) verwendet Python/JavaScript-Truthiness (`or` / `||`). Damit wird `override_portions=0` — d.h. eine Mahlzeit ohne Gäste — als "nicht gesetzt" interpretiert und fällt auf `norm_portions` durch. Alle Energie- und Kostenberechnungen für solche Mahlzeiten sind damit falsch.

## What Changes

- **Backend** `Meal.effective_portions` (`models/meal_plan.py:352`): `return self.override_portions or ...` → explizite `None`-Prüfung
- **Frontend** `effectivePortions()` (`schemas/mealPlan.ts:396`): `meal.override_portions || normPortions || 1` → explizite `null`/`undefined`-Prüfung
- **Backend** `update_meal`-Endpunkt (`api/meal_plan.py:565`): Guard `if payload.override_portions > 0 else None` ebenfalls korrigieren, sodass `0` setzbar ist (oder als `null` interpretiert wird — je nach Semantik)

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Backend**: `backend/planner/models/meal_plan.py`
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts`
- **Keine Migrationen** erforderlich
