# meal-plan Delta Spec

## MODIFIED Requirements

### Requirement: MealPlan nutritional tags

The MealPlan model SHALL have a `nutritional_tags` M2M field to `supply.NutritionalTag`. All NutritionalTag records SHALL be assignable. MealPlan nutritional tags represent **exclusion criteria** (Verbote) — assigned tags indicate ingredients or properties that SHALL NOT appear in the plan's meals.

The RecipeSearch and RecipeSuggestions APIs SHALL support excluding recipes that match the plan's nutritional tags via `exclude_nutritional_tag_ids` parameter.

#### Scenario: Create MealPlan with nutritional tags
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with `nutritional_tag_ids: [1, 2]` (e.g. Erdnuss + Milch)
- **THEN** the MealPlan is created with both tags assigned as exclusions

#### Scenario: Recipe search excludes tagged recipes
- **WHEN** a user searches recipes with `exclude_nutritional_tag_ids=[1,2]`
- **THEN** recipes containing NutritionalTag 1 or 2 SHALL NOT appear in results

#### Scenario: Recipe suggestions exclude tagged recipes
- **WHEN** recipe suggestions are requested for a MealPlan with nutritional tags
- **THEN** recipes matching any of the plan's nutritional tags SHALL be excluded from suggestions

#### Scenario: Update MealPlan nutritional tags
- **WHEN** an authenticated user sends PATCH `/api/meal-plans/{id}/` with `nutritional_tag_ids: [3]`
- **THEN** the MealPlan's nutritional tags are updated to only contain tag ID 3

#### Scenario: List MealPlan includes nutritional tag IDs and names
- **WHEN** GET `/api/meal-plans/` is called
- **THEN** each MealPlan in the response SHALL include `nutritional_tag_ids: [...]` and `nutritional_tag_names: [...]`

#### Scenario: MealPlan detail includes nutritional tags with full objects
- **WHEN** GET `/api/meal-plans/{id}/` is called
- **THEN** the response SHALL include `nutritional_tag_ids: [int, ...]` and `nutritional_tags: [NutritionalTagOut, ...]`

### Requirement: Recipe Suggestions exclude plan nutritional tags

The recipe suggestion system SHALL filter out recipes that have nutritional tags matching the meal plan's nutritional tags. When `exclude_nutritional_tag_ids` is provided, the API SHALL exclude recipes with those tags.

#### Scenario: Suggestions exclude tagged recipes via API parameter
- **WHEN** `GET /meal-plans/recipes/suggestions/?exclude_nutritional_tag_ids=1,2` is called
- **THEN** only recipes NOT containing tags 1 or 2 SHALL be returned

#### Scenario: Random recipe suggestion excludes tagged recipes
- **WHEN** `GET /meal-plans/recipes/suggestions/?random=true&exclude_nutritional_tag_ids=1` is called
- **THEN** the random suggestion SHALL NOT have nutritional tag 1
