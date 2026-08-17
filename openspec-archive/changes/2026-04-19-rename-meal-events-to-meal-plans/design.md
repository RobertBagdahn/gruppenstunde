## Context

Das Essensplan-Feature wurde ursprünglich als "MealPlan" konzipiert (DB-Tabelle: `planner_mealplan`), dann zu "MealEvent" umbenannt, da ein Essensplan an ein Event gebunden sein kann. Der Name "MealEvent" ist jedoch irreführend — es ist ein Planungstool, kein Event. Der kanonische Name soll `meal-plan` / `MealPlan` sein, konsistent mit der Domänenterminologie.

**Aktueller Zustand:**
- Backend: Model `MealEvent`, API unter `/api/meal-events/`, Schemas `MealEventOut` etc.
- Frontend: Routen `/meal-events/*`, Hooks `useMealEvents`, Schemas `MealEventSchema`
- DB-Tabelle: bereits `planner_mealplan` (korrekt)
- FK in Event-Model: `meal_plan` (korrekt benannt, zeigt auf MealEvent)

## Goals / Non-Goals

**Goals:**
- Konsistente Benennung: `MealPlan` überall (Models, Schemas, APIs, Routen, Hooks)
- API-Route: `/api/meal-plans/`
- Frontend-Routen: `/meal-plans/*`
- Keine DB-Migration nötig (Tabelle heisst bereits `planner_mealplan`)

**Non-Goals:**
- Funktionale Änderungen am Essensplan-Feature
- Änderung der DB-Tabellenstruktur oder Spaltennamen
- Änderung der `Meal` oder `MealItem` Model-Namen (bleiben)

## Decisions

### 1. Model-Rename: `MealEvent` -> `MealPlan`

**Entscheidung**: Das Django-Model wird von `MealEvent` zu `MealPlan` umbenannt. `db_table = 'planner_mealplan'` bleibt, daher keine DB-Migration nötig.

**Rationale**: Konsistenz mit dem kanonischen Namen. Da keine Rückwärtskompatibilität nötig ist, kann der Rename direkt durchgeführt werden.

### 2. Rename-Strategie: Alle Schichten gleichzeitig

**Entscheidung**: Backend (Models, Schemas, API), Frontend (Schemas, Hooks, Pages, Routes) werden in einem Durchgang umbenannt.

**Rationale**: Da keine Rückwärtskompatibilität nötig ist und kein externer Consumer existiert, ist ein Big-Bang-Rename der sauberste Ansatz.

### 3. Legacy-Redirects im Frontend

**Entscheidung**: `/meal-events/*` Routen werden als Redirects zu `/meal-plans/*` beibehalten.

**Rationale**: Benutzer könnten alte Bookmarks haben. Die Redirects sind minimal-invasiv.

## Risks / Trade-offs

- **[Risk]** Vergessene Referenzen in Strings/Comments → Mitigation: Globale Suche nach `meal.event`, `meal_event`, `MealEvent`, `mealEvent`
- **[Risk]** FK-Feld `meal_plan` in Event-Model zeigt auf umbenanntes Model → Mitigation: FK bleibt funktional, nur die Python-Klasse ändert sich
- **[Trade-off]** Big-Bang-Rename vs. schrittweiser Rename → Big-Bang gewählt, da keine externe API-Consumer existieren
