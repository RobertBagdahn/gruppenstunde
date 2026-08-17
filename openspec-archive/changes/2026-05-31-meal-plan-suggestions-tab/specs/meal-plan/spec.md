## MODIFIED Requirements

### Requirement: Meal plan creation
The system SHALL allow any authenticated user to create a meal plan. The creating user becomes the owner. The MealPlan SHALL support an optional `budget_per_person_per_day` field (DecimalField, nullable).

#### Scenario: Authenticated user creates meal plan
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with valid data
- **THEN** a new meal plan is created with the user as owner

#### Scenario: Authenticated user creates meal plan with budget
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with budget_per_person_per_day=8.00
- **THEN** a new meal plan is created with the budget value persisted

#### Scenario: Anonymous user tries to create meal plan
- **WHEN** an unauthenticated user sends POST `/api/meal-plans/`
- **THEN** the system returns 403 Forbidden
