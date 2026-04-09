## MODIFIED Requirements

### Requirement: EventDaySlot integration with MealPlan
The event day plan SHALL visually integrate meal slots from the MealPlan system. When an event has a linked MealPlan, meal times SHALL appear in the day plan timeline alongside other activity slots.

#### Scenario: MealPlan meals in day plan
- **WHEN** an event has a linked MealPlan with meals for a specific date
- **THEN** meal slots SHALL appear in the day plan timeline with recipe names
- **THEN** meal slots SHALL be visually distinguished from activity slots (different color/icon)
- **THEN** clicking a meal slot SHALL navigate to the MealPlan detail

#### Scenario: MealItem shows recipe in day plan
- **WHEN** a Meal in the MealPlan has MealItems (recipes)
- **THEN** the day plan meal slot SHALL list the recipe names
- **THEN** each recipe SHALL link to its Recipe detail page

## ADDED Requirements

### Requirement: MealItem references recipe from recipe app
MealItem SHALL continue to reference Recipe via FK, but Recipe now inherits from Content. The FK relationship SHALL be updated to point to `recipe.Recipe`.

#### Scenario: Adding recipe to meal
- **WHEN** a user adds a recipe to a meal in the meal plan
- **THEN** the MealItem SHALL reference the Recipe (which inherits from Content)
- **THEN** the recipe's Content base fields (title, image, tags) SHALL be accessible
