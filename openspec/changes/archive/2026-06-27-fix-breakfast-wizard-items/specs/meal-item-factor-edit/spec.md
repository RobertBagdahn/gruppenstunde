## MODIFIED Requirements

### Requirement: MealItem factor is editable in the meal plan UI

The system SHALL display an always-visible numeric input field for each MealItem showing its current factor value. The input SHALL be prefixed with "×" to indicate it is a multiplier. For ingredient-based items (those with `ingredient_id` but no `recipe_id`), the system SHALL display the item's quantity with unit instead of the factor. The factor remains editable only for recipe-based items.

#### Scenario: Recipe item shows factor input
- **WHEN** a MealItem has a `recipe_id`
- **THEN** the input field shows "× {factor}" as an editable FactorInput

#### Scenario: Ingredient item shows quantity instead of factor
- **WHEN** a MealItem has an `ingredient_id` but no `recipe_id`
- **THEN** the display shows "× {quantity} {unit}" (e.g., "× 150 g") instead of the factor
- **AND** the quantity display is NOT editable via FactorInput
- **AND** the factor value is not shown (it is internal to the backend calculation)

#### Scenario: Ingredient item with display_name (no ingredient_id)
- **WHEN** a MealItem has only `display_name` (text-only item)
- **THEN** no factor or quantity display is shown
