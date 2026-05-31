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

## Added by ref-meal-sync

### Requirement: Meal Model Felder
Das Meal-Model SHALL die folgenden zusätzlichen Felder haben:
- `is_reference` (BooleanField, default=False): Markiert ein Meal als Referenz-Template
- `ref_meal` (FK zu Meal, nullable): Verweis auf das Referenz-Meal
- `is_synced` (BooleanField, default=False): Ob dieses Meal aktiv mit dem RefMeal synchronisiert ist
- `start_datetime` wird nullable (NULL bei RefMeals)

#### Scenario: RefMeal hat kein Datum
- **WHEN** ein Meal mit `is_reference=True` erstellt wird
- **THEN** ist `start_datetime=NULL` erlaubt

#### Scenario: Normales Meal bleibt unverändert
- **WHEN** ein Meal mit `is_reference=False` existiert
- **THEN** MUSS `start_datetime` weiterhin gesetzt sein

### Requirement: Meal Uniqueness Constraint
Pro MealPlan und meal_type SHALL maximal ein Meal mit `is_reference=True` existieren.

#### Scenario: Unique RefMeal pro Typ
- **WHEN** bereits ein RefMeal (breakfast) für den Plan existiert
- **THEN** wird ein zweites RefMeal (breakfast) für den gleichen Plan mit ValidationError abgelehnt
