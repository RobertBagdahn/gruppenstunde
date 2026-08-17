## ADDED Requirements

### Requirement: Shopping list view uses ingredient-based name resolution
The view endpoint (`GET /api/shopping-lists/{id}/view/`) SHALL resolve item display names using `item.ingredient.name` when an ingredient is linked, falling back to `item.name` for manual/free-text items.

#### Scenario: View item with linked ingredient
- **WHEN** a shopping list contains an item with `ingredient_id` linked to an ingredient named "Tomaten"
- **THEN** the view response SHALL use "Tomaten" as the item's display name

#### Scenario: View item without linked ingredient
- **WHEN** a shopping list contains a manual item with `ingredient_id=NULL` and `name="Taschentücher"`
- **THEN** the view response SHALL use "Taschentücher" as the item's display name

#### Scenario: Summarized view groups by ingredient
- **WHEN** the summarized view (`?view=summarized`) is requested and multiple items share the same ingredient
- **THEN** the system SHALL group them by `ingredient_id` (or `name` for manual items) and sum their quantities

## MODIFIED Requirements

### Requirement: Source type enumeration
The `SourceType` enumeration in the shopping app SHALL use `meal_plan` as the internal value for meal-plan-derived shopping lists (renamed from `meal_event`).

#### Scenario: Source type value for meal plan lists
- **WHEN** a shopping list is created from a meal plan
- **THEN** the `source_type` SHALL be `"meal_plan"` with German label `"Essensplan"`
