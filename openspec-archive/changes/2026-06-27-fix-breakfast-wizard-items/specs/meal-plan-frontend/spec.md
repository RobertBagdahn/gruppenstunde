## MODIFIED Requirements

### Requirement: Meal plan detail page

The system SHALL display a meal plan detail view at `/meal-plans/:id` with a day-based layout showing meals grouped by date. The detail view MUST include tabs: Tagesplan, Tabelle, Nährwerte, Kosten, Einkaufsliste, Vorschläge, and optionally Allergie-Scanner (only when `nutritional_tag_ids.length > 0`).

Each MealItem SHALL display its name as a clickable link: recipe items link to `/recipes/{recipe_slug}`, ingredient items link to `/ingredients/{ingredient_id}`. Items without a linkable ID (display_name-only items) SHALL remain as plain text.

#### Scenario: Ingredient name is clickable
- **WHEN** a MealItem has an `ingredient_id`
- **THEN** the ingredient name is rendered as a clickable link to `/ingredients/{ingredient_id}`
- **AND** the link follows existing interaction patterns (hover color, transition)

#### Scenario: Recipe name remains clickable
- **WHEN** a MealItem has a `recipe_id`
- **THEN** the recipe name links to `/recipes/{recipe_slug}` (unchanged from current behavior)

#### Scenario: Display-name item is not clickable
- **WHEN** a MealItem has only `display_name` (no recipe_id or ingredient_id)
- **THEN** the name is rendered as plain text (unchanged from current behavior)
