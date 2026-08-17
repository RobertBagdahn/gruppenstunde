## ADDED Requirements

### Requirement: Apply AI suggestions to meal plan

The system SHALL provide an endpoint `POST /api/meal-plans/{id}/apply-ai/` that accepts the AI suggestion structure and creates the corresponding Meal and MealItem records in a single transaction. The endpoint SHALL be idempotent — calling it twice with the same payload SHALL result in duplicate MealItems only if the same recipe_id is already assigned to the same meal slot on the same date.

#### Scenario: Apply suggestions to a newly created plan

- **WHEN** a `POST /api/meal-plans/{id}/apply-ai/` request is sent with a valid `AiApplyIn` payload containing 2 days, each with meals referencing existing recipe_ids
- **THEN** the system SHALL call `create_meals_for_date_timeaware()` for each day in the payload
- **THEN** the system SHALL create a `MealItem` for each suggested recipe in the correct Meal (matched by date + meal_type)
- **THEN** each MealItem SHALL have `recipe_id` set to the suggested recipe_id and `factor` defaulting to 1.0
- **THEN** the response SHALL return 200 with the updated MealPlan detail (full plan with meals and items)

#### Scenario: Unauthenticated access

- **WHEN** an unauthenticated user sends `POST /api/meal-plans/{id}/apply-ai/`
- **THEN** the system SHALL return 403

#### Scenario: Unauthorized access

- **WHEN** a user who is not the owner or collaborator of the MealPlan sends `POST /api/meal-plans/{id}/apply-ai/`
- **THEN** the system SHALL return 403

#### Scenario: Non-existent recipe_id in suggestions

- **WHEN** one of the suggested recipe_ids does not exist in the database
- **THEN** the system SHALL skip that recipe_id (no MealItem created)
- **THEN** the response SHALL include a `skipped` list with details of skipped items

#### Scenario: Non-existent meal plan

- **WHEN** `POST /api/meal-plans/{id}/apply-ai/` is sent with an id that doesn't exist
- **THEN** the system SHALL return 404

#### Scenario: Invalid meal_type in suggestions

- **WHEN** a suggested meal_type does not match any valid meal_type (e.g. "brunch" instead of "breakfast"/"lunch"/"dinner")
- **THEN** the system SHALL skip that meal suggestion
- **THEN** the system SHALL NOT fail the entire request

### Requirement: Apply AI suggestions response schema

The `POST /api/meal-plans/{id}/apply-ai/` endpoint SHALL return a response indicating which suggestions were applied, skipped, and optionally the updated plan summary.

#### Scenario: Successful apply with all suggestions applied

- **WHEN** all recipe_ids are valid and all meal_types match
- **THEN** the response SHALL include `applied: 5, skipped: 0, skipped_items: []`
- **THEN** the response SHALL include `plan: <MealPlanOut>` with the updated plan

#### Scenario: Partial apply with skipped items

- **WHEN** 2 out of 5 recipe_ids are invalid
- **THEN** the response SHALL include `applied: 3, skipped: 2`
- **THEN** the response SHALL include `skipped_items: [{ day: "2026-08-14", meal_type: "lunch", recipe_id: 9999, reason: "Recipe not found" }]`

### Requirement: Frontend applies AI suggestions after plan creation

When the user selects AI strategy in the meal plan wizard and clicks "Essensplan erstellen", the frontend SHALL first create the empty plan, then call `POST /api/meal-plans/{id}/apply-ai/` with the stored suggestions, and only navigate to the plan page on success.

#### Scenario: AI strategy creates plan and applies suggestions

- **WHEN** the user is on the cockpit step with AI strategy selected and AI suggestions stored
- **AND** the user clicks "Essensplan erstellen"
- **THEN** the system SHALL call `POST /api/meal-plans/` to create the empty plan
- **THEN** on success, the system SHALL call `POST /api/meal-plans/{id}/apply-ai/` with the stored ai_suggestions
- **THEN** on success, the system SHALL navigate to the new plan page
- **THEN** the system SHALL show a toast "Essensplan mit KI-Vorschlägen erstellt"

#### Scenario: Create plan succeeds but apply fails

- **WHEN** the plan is created but the apply-ai call fails (e.g. network error)
- **THEN** the system SHALL show a toast warning "Essensplan erstellt, aber KI-Vorschläge konnten nicht übernommen werden"
- **THEN** the system SHALL still navigate to the plan page (partial success)

#### Scenario: Create plan fails with AI strategy

- **WHEN** the initial create mutation fails with AI strategy selected
- **THEN** the system SHALL show an error toast "Fehler beim Erstellen des Essensplans"
- **THEN** the system SHALL NOT navigate away
