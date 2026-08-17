## Why

Die API-Route `/api/meal-events/` und die zugehörigen Frontend-Routen `/meal-events/*` verwenden den Namen "meal-events", obwohl der kanonische Name für dieses Feature "meal-plans" (Essenspläne) ist. Das Model heisst `MealEvent` (DB-Tabelle: `planner_mealplan`), was historisch aus einem Rename entstanden ist. Die Inkonsistenz zwischen URL-Naming und konzeptuellem Namen führt zu Verwirrung. Ein einheitlicher Name `meal-plans` für URLs und `MealPlan` für Models/Schemas verbessert die Verständlichkeit.

## What Changes

- **BREAKING**: Backend-Route `/api/meal-events/` wird zu `/api/meal-plans/` umbenannt
- **BREAKING**: Frontend-Routen `/meal-events/*` werden zu `/meal-plans/*` umbenannt (mit Redirect von alten URLs)
- Backend-Model `MealEvent` wird zu `MealPlan` umbenannt (DB-Tabelle `planner_mealplan` bleibt)
- Pydantic-Schemas: `MealEventOut`, `MealEventDetailOut`, `MealEventCreateIn`, `MealEventUpdateIn` -> `MealPlanOut`, etc.
- Zod-Schemas: `mealEvent.ts` -> `mealPlan.ts`, alle Schema-Namen anpassen
- API-Hook-Datei: `mealEvents.ts` -> `mealPlans.ts`, alle Hook-Namen anpassen
- Frontend-Seiten: `MealEventLandingPage`, `MealEventListPage`, `MealEventDetailPage` -> `MealPlanLandingPage`, etc.
- Alle internen Referenzen (Event-Model FK, Shopping-List source_type, etc.) anpassen

## Capabilities

### New Capabilities

Keine neuen Capabilities.

### Modified Capabilities

- `meal-plan`: API-Pfade, Model-Namen, Schema-Namen und Frontend-Routen werden von "meal-event" zu "meal-plan" umbenannt
- `planner`: Übergeordnete Spec referenziert `/api/meal-plans/` statt `/api/meal-events/`
- `shopping-list`: `source_type` Wert und API-Pfad für MealPlan-Export anpassen

## Impact

- **Backend**: `planner/` App (Models, API, Schemas), `event/` App (FK-Referenz), `shopping/` App (source_type), `inspi/urls.py` (Route-Mount)
- **Frontend**: `src/api/mealEvents.ts`, `src/schemas/mealEvent.ts`, `src/pages/planning/MealEvent*.tsx`, `src/App.tsx` (Routen)
- **Pydantic-Schemas**: `planner/schemas/meal_plan.py` — alle `MealEvent*` Schemas
- **Zod-Schemas**: `frontend/src/schemas/mealEvent.ts` — alle `MealEvent*` Schemas
- **Keine DB-Migration nötig**: DB-Tabelle heisst bereits `planner_mealplan`, nur `db_table` Meta muss ggf. angepasst werden
