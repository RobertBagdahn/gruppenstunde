## ADDED Requirements

### Requirement: Ingredient usage_count field
The Ingredient model SHALL have a `usage_count` field (IntegerField, default=0) that tracks how many RecipeItem instances reference the ingredient via its portion.

#### Scenario: Ingredient created without references
- **WHEN** a new Ingredient is created
- **THEN** `usage_count` SHALL be 0

#### Scenario: Ingredient usage_count incremented on RecipeItem create
- **WHEN** a RecipeItem is created with a portion that references Ingredient A
- **THEN** Ingredient A's `usage_count` SHALL be incremented by 1

#### Scenario: Ingredient usage_count decremented on RecipeItem delete
- **WHEN** a RecipeItem referencing Ingredient A is deleted
- **THEN** Ingredient A's `usage_count` SHALL be decremented by 1

#### Scenario: Ingredient usage_count updated on RecipeItem portion change
- **WHEN** a RecipeItem's portion is changed from Ingredient A to Ingredient B
- **THEN** Ingredient A's `usage_count` SHALL be decremented by 1
- **AND** Ingredient B's `usage_count` SHALL be incremented by 1

#### Scenario: Usage_count never goes below zero
- **WHEN** any operation would decrement `usage_count` below 0
- **THEN** `usage_count` SHALL be set to 0 instead

### Requirement: Backfill ingredient usage_count
A management command SHALL backfill `usage_count` for all existing Ingredient records based on RecipeItem references.

#### Scenario: Run backfill command
- **WHEN** `uv run python manage.py backfill_ingredient_usage_count` is executed
- **THEN** each Ingredient's `usage_count` SHALL be set to `RecipeItem.objects.filter(portion__ingredient=ing).count()`
- **THEN** Ingredients with no RecipeItem references SHALL have `usage_count = 0`

### Requirement: Ingredient usage_count exposed in API
The ingredient suggest endpoint and detail endpoint SHALL include `usage_count` in their response.

#### Scenario: Suggest endpoint returns usage_count
- **WHEN** `GET /api/ingredients/suggest/?q=Salz&limit=15` is called
- **THEN** each result object SHALL include `usage_count` (integer)

#### Scenario: Detail endpoint returns usage_count
- **WHEN** `GET /api/ingredients/{slug}/` is called
- **THEN** the response SHALL include `usage_count` (integer)