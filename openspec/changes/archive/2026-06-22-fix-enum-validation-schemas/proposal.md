## Why

Mehrere Pydantic-Schemas akzeptieren sicherheitsrelevante Felder als freie Strings ohne Enum-Validierung: `MealPlanUpdateIn.visibility`, `MealPlanCollaboratorCreateIn.role`, `MealPlanCollaboratorUpdateIn.role`, `InviteIn.role` und `PlannerEntryIn.status`. Ein Angreifer kann beliebige Strings eintragen, die in die Datenbank persistiert werden und die Zugriffskontroll-Logik korrumpieren.

## What Changes

- `MealPlanUpdateIn.visibility`: `str | None` → `Literal["private", "group", "public"] | None`
- `MealPlanCollaboratorCreateIn.role` + `MealPlanCollaboratorUpdateIn.role`: `str` → `Literal["viewer", "editor", "admin"]`
- `InviteIn.role` (`schemas/planner.py`): `str` → `Literal["editor", "viewer"]`
- `PlannerEntryIn.status` + `PlannerEntryUpdateIn.status`: `str` → entsprechende Literal-Typen aus `EntryStatusChoices`
- Frontend-Zod-Schemas synchronisieren: `MealPlanUpdateInSchema.visibility`, Collaborator-Roles und Planner-Status ebenfalls auf `z.enum([...])` umstellen

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Anforderungsänderungen)_

## Impact

- **Backend**: `backend/planner/schemas/meal_plan.py`, `backend/planner/schemas/planner.py`
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` (Collaborator-Role, Visibility)
- **Keine Migrationen** erforderlich
