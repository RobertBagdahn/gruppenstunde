## 1. Backend: MealPlanCollaborator Model

- [x] 1.1 Create `MealPlanCollaborator` model in `planner/models/` with fields: meal_plan FK, user FK, role (viewer/editor/admin), created_at. Add `CollaboratorRole` TextChoices.
- [x] 1.2 Run `uv run python manage.py makemigrations planner` and verify migration

## 2. Backend: Meal Plan Permission Helpers

- [x] 2.1 Create helper functions `_get_user_role(meal_plan, user)` and `_require_edit_permission(meal_plan, user)` in planner API
- [x] 2.2 Replace all `is_staff` checks in meal plan API endpoints with `is_authenticated` + role-based checks
- [x] 2.3 Update meal plan list endpoint to filter: own + collaborator (staff sees all)

## 3. Backend: MealPlanCollaborator API

- [x] 3.1 Create Pydantic schemas for MealPlanCollaborator (CreateSchema, ResponseSchema)
- [x] 3.2 Create CRUD endpoints at `/api/meal-plans/{id}/collaborators/` (list, add, update role, remove)
- [x] 3.3 Enforce that only owner/admin can manage collaborators

## 4. Backend: Shopping List Permission Changes

- [x] 4.1 Replace `is_staff` checks in shopping list creation endpoint with `is_authenticated`
- [x] 4.2 Update shopping list list endpoint to filter: own + collaborator (staff sees all)

## 5. Frontend: Zod Schemas & API Hooks

- [x] 5.1 Add Zod schema for MealPlanCollaborator (matching Pydantic schemas)
- [x] 5.2 Add TanStack Query hooks for meal plan collaborator CRUD
- [x] 5.3 Remove staff-gates on meal plan and shopping list creation buttons

## 6. Frontend: Meal Plan Collaborator UI

- [x] 6.1 Add collaborator management section to meal plan detail page (list, add, remove, change role)
- [x] 6.2 Reuse patterns from existing shopping list collaborator UI

## 7. Verification

- [ ] 7.1 Test: non-staff user can create meal plan and shopping list
- [ ] 7.2 Test: meal plan collaborator permissions work correctly (viewer/editor/admin)
- [ ] 7.3 Test: list endpoints only show accessible items for non-staff users
