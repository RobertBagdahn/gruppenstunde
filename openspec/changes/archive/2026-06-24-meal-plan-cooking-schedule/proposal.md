## Why

BUG-016 aus dem Stakeholder-Gespräch vom 23.06.2026: Dem Kochteam fehlt eine chronologische Zubereitungsübersicht. Aktuell ist nicht ersichtlich, wann mit der Zubereitung welches Rezepts begonnen werden muss, damit alle Gerichte einer Mahlzeit rechtzeitig zur Servierzeit fertig sind. Der Bug wurde im vorherigen Bugfix-Batch bewusst ausgelagert, weil er zu eigenständig und komplex für einen gebündelten Fix war.

## What Changes

- Neuer Backend-Endpunkt `GET /api/meal-plans/{id}/cooking-schedule/`, der pro Tag eine chronologisch nach berechneter Startzeit sortierte Liste aller Rezepte liefert.
- Startzeit-Berechnung **rückwärts von der Servierzeit** (`Meal.start_datetime`): `Startzeit = Servierzeit − (preparation_time + execution_time)`.
- Da `preparation_time`/`execution_time` als Choice-Buckets gespeichert sind (keine exakten Minuten), werden die **Bucket-Obergrenzen** als Minuten angesetzt (konservativ, damit Gerichte sicher rechtzeitig fertig sind):
  - `execution_time`: `less_30`=30, `30_60`=60, `60_90`=90, `more_90`=120
  - `preparation_time`: `none`=0, `less_15`=15, `15_30`=30, `30_60`=60, `more_60`=90
- Neue Frontend-Seite (Kochplan) im Essensplan-Bereich, gruppiert pro Tag, mit Spalten: Startzeit, Servierzeit, Rezeptname (verlinkt), Zubereitungsdauer, Mahlzeit-Typ (Badge), Portionen.
- Dedizierte Druck-Route `/meal-plans/:id/cooking-schedule/print` (kein FoodLayout, alle Sektionen ausgeklappt, A4-optimiert) — analog zu den bestehenden Print-Routen (`meal-plan-print`, `recipe-print-route`).

## Capabilities

### New Capabilities

- `meal-plan-cooking-schedule`: Chronologische Zubereitungsübersicht eines Essensplans. Berechnet rückwärts von der Servierzeit, wann mit jedem Rezept begonnen werden muss, gruppiert pro Tag. Umfasst Backend-Endpunkt, interaktive Frontend-Ansicht und Druck-Route.

### Modified Capabilities

<!-- Keine bestehenden Capabilities ändern ihre Requirements. -->

## Impact

**Backend (Django, `planner` App):**
- Neuer Service `planner/services/cooking_schedule_service.py` mit Bucket→Minuten-Mapping und Rückwärtsberechnung.
- Neuer API-Endpunkt `GET /api/meal-plans/{id}/cooking-schedule/` im `planner` Router.
- Neue Pydantic-Schemas: `CookingScheduleOut`, `CookingScheduleDayOut`, `CookingScheduleItemOut`.
- Liest bestehende Felder: `Meal.start_datetime` (Servierzeit), `Meal.meal_type`, `Recipe.preparation_time`, `Recipe.execution_time`, Portionen via `Meal.override_portions`/`MealPlan.norm_portions`.
- **Keine Migration nötig** — nutzt ausschließlich vorhandene Felder.
- Tests: Happy-Path + Auth-Fehlerfall + Berechnungslogik (Bucket-Mapping, Rückwärtsberechnung, Tages-Gruppierung).

**Frontend (`frontend-food`):**
- Neue Zod-Schemas synchron zu den Pydantic-Schemas.
- Neuer TanStack-Query-Hook `useCookingSchedule(mealPlanId)`.
- Neue Seite `CookingSchedulePage.tsx` (interaktiv, im FoodLayout) + Route.
- Neue Print-Seite `CookingSchedulePrintPage.tsx` + Route `/meal-plans/:id/cooking-schedule/print` (ohne FoodLayout).
- „Kochplan"-Button auf der Essensplan-Detailseite.
