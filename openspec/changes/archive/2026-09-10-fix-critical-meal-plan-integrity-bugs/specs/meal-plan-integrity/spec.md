## ADDED Requirements

### Requirement: Privacy in AI breakfast candidates
The system SHALL only select breakfast candidates for AI suggestions from public templates, verified plans, or plans created by the requesting user. Private plans from other users SHALL NEVER be queried or sent to an LLM prompt.

#### Scenario: Breakfast candidates privacy isolation
- **WHEN** a user requests AI suggestions for a meal plan
- **THEN** only candidate breakfasts from public templates, verified plans, or the user's own plans SHALL be included in the candidate pool.

### Requirement: Authorization check for reference and AI-applied items
The system SHALL verify that the requesting user has read visibility for every `recipe_id` and `ingredient_id` before adding it to reference meals or applying AI proposals.

#### Scenario: Reject unauthorized private recipes
- **WHEN** a user attempts to add an unshared private recipe of another user via reference meals or AI apply
- **THEN** the request SHALL be rejected with an authorization error or the item SHALL be omitted.

### Requirement: Accurate allergen matrix in PDF export
The meal plan PDF export SHALL populate the allergen matrix using the aggregated allergens of all recipes and ingredients planned for each day, instead of returning an empty matrix.

#### Scenario: Allergens displayed on PDF
- **WHEN** a meal plan containing dishes with gluten and celery is exported to PDF
- **THEN** the PDF allergen table SHALL display positive markers for gluten and celery on the respective days.

### Requirement: Accurate scaling and variants in PDF export
The meal plan PDF export SHALL scale ingredient quantities using the meal item factor, portion unit quantity, and active variant ingredient selections.

#### Scenario: PDF reflects active variant
- **WHEN** a recipe variant with oat milk instead of cow milk is planned
- **THEN** the PDF ingredients list SHALL display oat milk with the scaled quantity.

### Requirement: Preserve measuring unit in AI-applied ingredients
When applying AI suggestions containing ingredient items, the system SHALL resolve and persist a valid `measuring_unit_id` so that weight, energy, and cost calculations do not collapse to zero.

#### Scenario: AI ingredient has positive energy
- **WHEN** an AI breakfast with bread and butter is applied
- **THEN** the created meal items SHALL have a valid measuring unit and positive calculated calories.

### Requirement: Preserve variants and overrides during duplication and copy
When duplicating a meal plan or copying items between meals, the system SHALL copy `active_recipe_item_ids` and `variant_group_id` alongside factors and overrides.

#### Scenario: Duplicated plan preserves variant
- **WHEN** a plan with a customized recipe variant is duplicated
- **THEN** the new plan items SHALL retain the identical active recipe item IDs.

### Requirement: Exclude external meals from purchasing and nutrition
Meals marked as `is_external=True` SHALL NOT contribute their historical or retained `MealItem` ingredients to the shopping list or the food calorie summary.

#### Scenario: External restaurant meal shopping list
- **WHEN** a meal with ingredients is toggled to external restaurant
- **THEN** its ingredients SHALL NOT appear in the generated shopping list.

### Requirement: Variant slider multi-choice proportion calculation
The variant slider redistribution formula SHALL calculate remaining portions as proportions of remaining portions so that the total portions across all options remain invariant.

#### Scenario: Three-way exchange invariant
- **WHEN** 10 portions are distributed across three exchange items and one item is set to 2 portions
- **THEN** the sum of all three items SHALL remain exactly 10 portions.

### Requirement: Drinks meal type in registry and views
The system SHALL support `drinks` as a first-class meal type in backend choices, shared registries, table views, and cooking schedules.

#### Scenario: Drinks slot rendered in table
- **WHEN** the table view is opened for a plan with drinks
- **THEN** a dedicated drinks row SHALL be displayed with icon and label.

### Requirement: Ingredient search input visibility
The search input in `RecipeSearchDialog` SHALL remain visible and functional when searching for ingredients, allowing text search over all available ingredients.

#### Scenario: Search ingredient by name
- **WHEN** a user opens the ingredient dialog or selects the ingredient filter
- **THEN** the text input field SHALL be visible and filter ingredients dynamically.

### Requirement: Deletion undo accuracy
In table and day views, deletion success notifications and Undo actions SHALL only be triggered after deletion has actually been confirmed and executed by the backend.

#### Scenario: Cancel delete item
- **WHEN** a user clicks delete on an item in table view and cancels the confirmation dialog
- **THEN** no deletion toast SHALL appear and the item SHALL remain intact.

### Requirement: Breakfast wizard contextual scope
Triggering the breakfast wizard from an individual meal's actions menu SHALL open the wizard targeted to that specific meal rather than opening the global reference meal.

#### Scenario: Single meal breakfast edit
- **WHEN** a user selects the breakfast wizard on Tuesday's breakfast
- **THEN** the wizard SHALL be targeted to Tuesday's meal ID.

### Requirement: AI prompt reset functionality
In the AI prompt wizard step, selecting "Anderen Prompt ausprobieren" SHALL reset existing AI suggestions so the user can enter a new prompt and regenerate suggestions.

#### Scenario: Reset AI suggestions
- **WHEN** a user clicks "Anderen Prompt ausprobieren"
- **THEN** previous suggestions SHALL be cleared and the prompt input SHALL be interactive.

### Requirement: Distinct daily nutrition values
The nutrition suggestions view SHALL calculate and display the actual daily nutrient values for each date rather than repeating the full plan's average across every day.

#### Scenario: Variable day nutrition display
- **WHEN** day 1 has 1500 kcal and day 2 has 2500 kcal
- **THEN** the respective daily bars SHALL display 1500 kcal and 2500 kcal instead of 2000 kcal for both.
