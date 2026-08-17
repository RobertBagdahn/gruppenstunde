## Why

Die Route `POST /api/meal-plans/ai-suggest/` ist unerreichbar, weil der `meal_plan_router` mit `GET /{meal_plan_id}/` das Pfadsegment `ai-suggest` als `meal_plan_id` matched und einen 405 zurückgibt, bevor der `ai_suggest_router` die Anfrage verarbeiten kann. Das blockiert den KI-Assistenten im Meal-Plan-Wizard.

## What Changes

- **Neuer Namespace `/meal-plans/ai/`** – AI-Endpunkte für Essensplanung leben unter `/meal-plans/ai/` (z.B. `POST /meal-plans/ai/suggest/`)
- **Router-Reihenfolge in `urls.py`** – Spezifische Router (`ai_suggest_router`, `ref_meal_router`) werden vor dem catch-all `meal_plan_router` registriert
- **Path Converter für `meal_plan_id`** – `int`-Typ wird im URL-Pattern erzwungen, sodass Strings wie `ai-suggest` nicht mehr als ID matched werden (404 statt 405)
- **Frontend-URL angepasst** – `mealPlans.ts` ruft `/ai/suggest/` statt `/ai-suggest/` auf
- **Konvention in `backend/AGENTS.md`** – Regel für Router-Reihenfolge dokumentieren: spezifische Pfade vor parametrisierten Routern

## Capabilities

### New Capabilities
Keine neuen Capabilities – reine Infrastruktur- und Bugfix-Änderung an bestehenden Routen.

### Modified Capabilities
Keine Änderungen an Capability-Specs erforderlich.

## Impact

- **Backend**: `inspi/urls.py` (Router-Reihenfolge), `planner/api/ai_generation.py` (neuer Pfad), `planner/api/meal_plan.py` (path converter)
- **Frontend**: `frontend-food/src/api/mealPlans.ts` (API-URL)
- **Tests**: `planner/tests/test_ai_generation.py` (URLs anpassen)
- **Keine Migrationen** erforderlich
- **Keine Pydantic/Zod-Schema-Änderungen** – Request/Response bleiben identisch
