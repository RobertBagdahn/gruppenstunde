## ADDED Requirements

### Requirement: Duplicate meal plan via API
The system SHALL provide an endpoint `POST /api/meal-plans/{slug}/duplicate/` that creates a copy of an existing meal plan with new parameters.

#### Scenario: Successful duplication
- **WHEN** authenticated user sends POST to `/api/meal-plans/{slug}/duplicate/` with `{ name: "Sommerlager 2026", start_datetime: "2026-07-01T10:00:00Z", norm_portions: 30 }`
- **THEN** the system creates a new MealPlan with the given name, start_datetime, norm_portions, and end_datetime calculated as `source.end_datetime + (new_start - source.start_datetime)`
- **AND** all Meals from the source plan are copied with their datetimes shifted by the offset
- **AND** all MealItems from each Meal are copied with recipe, ingredient, factor, quantity, measuring_unit, display_name
- **AND** the response contains the new MealPlan in `MealPlanOut` format

#### Scenario: Source plan not found
- **WHEN** authenticated user sends POST to `/api/meal-plans/{slug}/duplicate/` with a non-existing slug
- **THEN** the system returns HTTP 404

#### Scenario: Unauthenticated request
- **WHEN** unauthenticated user sends POST to `/api/meal-plans/{slug}/duplicate/`
- **THEN** the system returns HTTP 401

#### Scenario: Missing required fields
- **WHEN** authenticated user sends POST without name, start_datetime, or norm_portions
- **THEN** the system returns HTTP 422 with validation errors

### Requirement: Excluded data from duplication
The system SHALL NOT copy MealPlanCollaborators, MealItemOverrides, or Meal notes when duplicating a plan.

#### Scenario: Collaborators not copied
- **WHEN** a plan with collaborators is duplicated
- **THEN** the new plan has no collaborators (only created_by is set to the requesting user)

#### Scenario: Overrides not copied
- **WHEN** a plan with MealItemOverrides is duplicated
- **THEN** the new plan's MealItems have no overrides

#### Scenario: Notes not copied
- **WHEN** a plan with Meal notes is duplicated
- **THEN** the new plan's Meals have empty note fields

