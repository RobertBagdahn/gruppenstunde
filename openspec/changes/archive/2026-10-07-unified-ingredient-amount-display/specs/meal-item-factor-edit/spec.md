## MODIFIED Requirements

### Requirement: MealItem factor is editable in the meal plan UI

The system SHALL display an always-visible numeric input field for each recipe-based MealItem showing its current factor value, prefixed with "×" to indicate a multiplier. For ingredient-based items (those with `ingredient_id` but no `recipe_id`), the system SHALL display the item's quantity in an editable input together with a unit/portion selection instead of the factor (see `meal-item-unit-edit`). The factor remains editable only for recipe-based items.

#### Scenario: Recipe item shows factor input
- **WHEN** a MealItem has a `recipe_id`
- **THEN** the input field shows "× {factor}" as an editable FactorInput

#### Scenario: Ingredient item shows quantity instead of factor
- **WHEN** a MealItem has an `ingredient_id` but no `recipe_id` and the user may edit
- **THEN** the row shows an editable quantity input and a unit/portion selection (e.g., "150" and "Gramm" or "0,5" and "EL")
- **AND** the factor value is not shown (it is internal to the backend calculation)

#### Scenario: Ingredient item read-only
- **WHEN** a MealItem has an `ingredient_id` but no `recipe_id` and the user may not edit or the meal is synced
- **THEN** the row shows the quantity with its unit as text

#### Scenario: Ingredient item with display_name (no ingredient_id)
- **WHEN** a MealItem has only `display_name` (text-only item)
- **THEN** no factor or quantity display is shown
