## 1. Backend: Pydantic-Schemas korrigieren

- [x] 1.1 `planner/schemas/meal_plan.py`: `MealPlanUpdateIn.visibility` → `Literal["private", "group", "public"] | None = None`
- [x] 1.2 `planner/schemas/meal_plan.py`: `MealPlanCollaboratorCreateIn.role` → `Literal["viewer", "editor", "admin"] = "viewer"`
- [x] 1.3 `planner/schemas/meal_plan.py`: `MealPlanCollaboratorUpdateIn.role` → `Literal["viewer", "editor", "admin"]`
- [x] 1.4 `planner/schemas/planner.py`: `InviteIn.role` → `Literal["editor", "viewer"] = "viewer"`
- [x] 1.5 `planner/schemas/planner.py`: `PlannerEntryIn.status` → `Literal["planned", "done", "skipped"] = "planned"` (Werte aus `EntryStatusChoices` prüfen)
- [x] 1.6 `planner/schemas/planner.py`: `PlannerEntryUpdateIn.status` → `Literal["planned", "done", "skipped"] | None = None`
- [x] 1.7 `from typing import Literal` Import in beiden Schema-Dateien ergänzen

## 2. Frontend: Zod-Schemas korrigieren

- [x] 2.1 `schemas/mealPlan.ts`: `MealUpdateInSchema.visibility` → `z.enum(["private", "group", "public"]).nullable().optional()`
- [x] 2.2 `schemas/mealPlan.ts`: Collaborator-Role-Felder → `z.enum(["viewer", "editor", "admin"])`
- [x] 2.3 Planner-Status-Felder im entsprechenden Frontend-Schema anpassen

## 3. Tests

- [x] 3.1 Backend-Test: `PATCH /meal-plans/{id}/` mit `visibility="intern"` → 422
- [x] 3.2 Backend-Test: Collaborator-Create mit `role="superadmin"` → 422
- [x] 3.3 Backend-Test: Valide Werte werden weiterhin akzeptiert
