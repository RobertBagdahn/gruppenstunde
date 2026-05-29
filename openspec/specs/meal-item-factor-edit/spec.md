# Meal Item Factor Edit

## Requirements

### Requirement: MealItem factor can be updated via API
The system SHALL provide a PATCH endpoint at `/{meal_plan_id}/meal-items/{item_id}/` that accepts a JSON body with `factor` (float) and updates the MealItem's factor field.

#### Scenario: Successful factor update
- **WHEN** authenticated user sends PATCH to `/{meal_plan_id}/meal-items/{item_id}/` with `{"factor": 0.33}`
- **THEN** the MealItem's factor is updated to 0.33 and the updated MealItem is returned as JSON

#### Scenario: Invalid meal item
- **WHEN** user sends PATCH with a non-existent item_id
- **THEN** the system returns HTTP 404

### Requirement: MealItem factor is editable in the meal plan UI
The system SHALL display an always-visible numeric input field for each MealItem showing its current factor value. The input SHALL be prefixed with "×" to indicate it is a multiplier.

#### Scenario: User changes factor via input
- **WHEN** user changes the factor input value and leaves the field (blur) or presses Enter
- **THEN** the new factor value is saved via the API and the meal's nutrition/cost display updates accordingly

#### Scenario: Factor displays current value
- **WHEN** a MealItem has factor 0.33
- **THEN** the input field shows "0.33"

#### Scenario: Default factor for new items
- **WHEN** a new MealItem is added
- **THEN** the factor input shows "1" (the default)
