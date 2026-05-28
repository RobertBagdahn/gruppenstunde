## MODIFIED Requirements

### Requirement: MealPlanItem supports ingredient as alternative to recipe
A MealPlanItem SHALL support either a Recipe OR an Ingredient (with portion and quantity), enforced by a database XOR constraint.

#### Scenario: Add ingredient to meal plan
- **WHEN** user selects a standalone ingredient and specifies portion + quantity
- **THEN** a MealPlanItem SHALL be created with `ingredient`, `portion`, and `quantity` fields set (recipe=null)

#### Scenario: Add recipe to meal plan (unchanged)
- **WHEN** user selects a recipe
- **THEN** a MealPlanItem SHALL be created with `recipe` set (ingredient=null, portion=null, quantity=null)

#### Scenario: XOR constraint enforcement
- **WHEN** attempting to create a MealPlanItem with both recipe and ingredient set
- **THEN** the database SHALL reject the record

#### Scenario: Ingredient meal plan item display
- **WHEN** viewing a meal plan that contains ingredient items
- **THEN** the ingredient name, portion name, and quantity SHALL be displayed

### Requirement: Quantity dialog for ingredient selection
The frontend SHALL display a quantity selection dialog when a user selects a standalone ingredient from search results.

#### Scenario: User selects ingredient from search
- **WHEN** user clicks on an ingredient in the search results
- **THEN** a dialog SHALL appear showing available portions for that ingredient and a quantity input

#### Scenario: User confirms quantity
- **WHEN** user selects a portion and enters a quantity and clicks "Hinzufügen"
- **THEN** the ingredient SHALL be added to the meal plan with the selected portion and quantity
