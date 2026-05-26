## ADDED Requirements

### Requirement: Simple Meal Recipe Type
The Recipe model SHALL support a new recipe_type choice value "simple_meal" for meals that only need an ingredients list without description or steps.

#### Scenario: Create simple meal
- **WHEN** a user creates a recipe with recipe_type="simple_meal"
- **THEN** the system SHALL allow saving without description or steps fields

#### Scenario: Simple meal in meal plan
- **WHEN** a simple_meal recipe is added to a MealPlan
- **THEN** it SHALL function identically to a regular recipe for shopping list and nutrition calculations

#### Scenario: Simple meal in recipe list
- **WHEN** recipe lists are displayed
- **THEN** simple_meal recipes SHALL appear with a distinct visual badge indicating their type

### Requirement: Simplified Frontend Form
The frontend SHALL provide a simplified create/edit form for simple_meal recipes that omits description and steps fields.

#### Scenario: Form selection
- **WHEN** a user selects "simple_meal" as recipe type during creation
- **THEN** the form SHALL only show fields for title, ingredients, servings, and category

#### Scenario: Edit existing simple meal
- **WHEN** a user edits an existing simple_meal recipe
- **THEN** the simplified form SHALL be shown with only the relevant fields
