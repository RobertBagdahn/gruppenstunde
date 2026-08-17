## ADDED Requirements

### Requirement: Soft-delete Food resources
Recipe and Ingredient SHALL support a nullable `deleted_at` timestamp. Normal lists, searches, catalogs, and new references SHALL exclude resources with a non-null `deleted_at`.

#### Scenario: Owner soft-deletes Recipe
- **WHEN** the Recipe owner deletes a Recipe
- **THEN** the API SHALL set `deleted_at` and SHALL keep existing references intact

#### Scenario: New reference to deleted Recipe
- **WHEN** a user adds a deleted Recipe to a MealItem
- **THEN** the API SHALL reject the request

### Requirement: Existing references survive deletion
Existing MealItems and RecipeItems referencing a soft-deleted resource SHALL remain stored. Calculations SHALL skip unavailable resources and the API SHALL expose an unavailable state where the reference is visible in an authorized context.

#### Scenario: MealPlan contains deleted Recipe
- **WHEN** a MealPlan contains a Recipe that was soft-deleted afterwards
- **THEN** the MealItem SHALL remain and calculations SHALL skip the deleted Recipe

#### Scenario: Deleted Ingredient has existing RecipeItem
- **WHEN** an Ingredient used by a Recipe is soft-deleted
- **THEN** the RecipeItem SHALL remain and new RecipeItems SHALL not reference that Ingredient
