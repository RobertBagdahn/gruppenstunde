## ADDED Requirements

### Requirement: Recipe usage count tracking
The system SHALL maintain a denormalized `usage_count` field on each Recipe that reflects how many times it has been added to any MealPlan (via MealItem).

#### Scenario: MealItem created with recipe
- **WHEN** a MealItem is created with a recipe FK
- **THEN** that recipe's `usage_count` SHALL be incremented by 1

#### Scenario: MealItem deleted
- **WHEN** a MealItem with a recipe FK is deleted
- **THEN** that recipe's `usage_count` SHALL be decremented by 1

#### Scenario: MealItem recipe changed
- **WHEN** a MealItem's recipe FK is changed from Recipe A to Recipe B
- **THEN** Recipe A's `usage_count` SHALL be decremented by 1 AND Recipe B's `usage_count` SHALL be incremented by 1

#### Scenario: Initial backfill
- **WHEN** the management command `backfill_recipe_usage_count` is run
- **THEN** all recipes SHALL have their `usage_count` set to the actual COUNT of MealItems referencing them

### Requirement: Popular recipes API endpoint
The system SHALL provide `GET /api/meal-plans/recipes/popular` returning the most-used recipes split into personal and community rankings.

#### Scenario: Authenticated user requests popular recipes
- **WHEN** an authenticated user requests `/api/meal-plans/recipes/popular?meal_type=breakfast&limit=8`
- **THEN** the response SHALL contain `personal` (recipes most used by this user, filtered by meal_type) and `community` (recipes with highest global usage_count, filtered by meal_type), each limited to `limit` items

#### Scenario: No meal_type filter
- **WHEN** the request omits `meal_type`
- **THEN** the response SHALL return popular recipes across all meal types

#### Scenario: Anonymous user
- **WHEN** an unauthenticated user requests popular recipes
- **THEN** the `personal` list SHALL be empty and `community` SHALL still be returned

### Requirement: Popular recipe response schema
Each recipe in the popular response SHALL include: id, title, recipe_type, image (nullable), usage_count.

#### Scenario: Recipe with image
- **WHEN** a popular recipe has an image
- **THEN** the response item SHALL include the image URL

#### Scenario: Recipe without image
- **WHEN** a popular recipe has no image
- **THEN** the image field SHALL be null
