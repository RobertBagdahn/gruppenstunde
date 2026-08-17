## ADDED Requirements

### Requirement: MealItemOverride Model
The system SHALL provide a MealItemOverride model with: meal_item FK, recipe_item FK, quantity_override (nullable Decimal), and excluded (bool, default false).

#### Scenario: Override excludes an ingredient
- **WHEN** a MealItemOverride exists with excluded=true for a recipe_item
- **THEN** that ingredient SHALL be excluded from shopping list generation and nutrition calculation

#### Scenario: Override adjusts quantity
- **WHEN** a MealItemOverride exists with a quantity_override value
- **THEN** the overridden quantity SHALL be used instead of the original recipe_item quantity in shopping list and nutrition calculations

### Requirement: Meal Item Overrides API
The system SHALL provide PATCH /api/meal-plans/{id}/meal-items/{item_id}/overrides/ accepting a list of override objects.

#### Scenario: Setting overrides
- **WHEN** a client PATCHes a list of overrides for a meal item
- **THEN** the system SHALL create or update MealItemOverride records for each specified recipe_item

#### Scenario: Overrides included in meal plan detail
- **WHEN** a client GETs the meal plan detail
- **THEN** each meal item SHALL include its list of overrides with recipe_item reference, quantity_override, and excluded flag

### Requirement: Shopping List Respects Overrides
Shopping list generation MUST apply MealItemOverride data when calculating quantities.

#### Scenario: Excluded items omitted from shopping list
- **WHEN** a shopping list is generated from a meal plan with excluded overrides
- **THEN** the excluded recipe items SHALL NOT appear in the shopping list

#### Scenario: Quantity overrides reflected in shopping list
- **WHEN** a shopping list is generated from a meal plan with quantity overrides
- **THEN** the overridden quantities SHALL be used instead of original recipe quantities
