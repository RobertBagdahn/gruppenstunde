## ADDED Requirements

### Requirement: Shopping List Direct Single-Ingredient Aggregation
The system SHALL aggregate and include direct single-ingredient items (`MealItem.ingredient`) in the generated shopping list, calculated using the correct quantities and portions.

#### Scenario: Generate shopping list with direct ingredient
- **WHEN** the user generates a shopping list from a meal plan containing a meal item with a direct ingredient and no recipe
- **THEN** the shopping list includes that ingredient with its scaled quantity.

### Requirement: Meal-Level Portion Override Scaling
The system SHALL calculate ingredient quantities in the shopping list by prioritizing the meal-level `override_portions` if set, rather than applying the global plan-level scaling factor.

#### Scenario: Generate shopping list with meal portion override
- **WHEN** the user generates a shopping list from a meal plan where a meal has `override_portions = 15` and the global plan has `portions = 10` (with reference portions = 10)
- **THEN** the system scales the ingredients for that meal by `1.5` instead of `1.0`.
