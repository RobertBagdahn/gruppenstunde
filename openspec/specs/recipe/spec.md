## MODIFIED Requirements

### Requirement: Cached nutrition fields on Recipe
The Recipe model SHALL cache only `cached_vitamin_c_mg` as micronutrient cache field. The fields `cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg` SHALL be removed.

#### Scenario: Recipe cache recalculation
- **WHEN** `recalculate_recipe_cache` runs
- **THEN** only `cached_vitamin_c_mg` is calculated and stored as micronutrient cache (macros unaffected)

#### Scenario: Nutrition breakdown API response
- **WHEN** the nutrition breakdown endpoint is called
- **THEN** micronutrient totals include only `vitamin_c_mg`

### Requirement: Recipe Folder Assignment
Recipe SHALL have an optional folder FK for organization of personal recipes.

#### Scenario: Filter by folder
- **WHEN** GET /api/recipes/my-recipes/?folder={id} is called
- **THEN** only recipes in that folder SHALL be returned

### Requirement: Recipe Type Simple Meal
Recipe recipe_type choices SHALL include "simple_meal".

#### Scenario: Simple meal creation
- **WHEN** a recipe is created with recipe_type="simple_meal"
- **THEN** the recipe SHALL be valid without a description field

### Requirement: URL Import
Recipe SHALL support creation from external URLs.

#### Scenario: Import from URL
- **WHEN** POST /api/recipes/import-from-url/ is called with a valid recipe URL
- **THEN** a preview of the parsed recipe data SHALL be returned

### Requirement: RecipeHint model structure
The RecipeHint model SHALL have the following fields: `name` (CharField), `description` (TextField, optional), `improvement_text` (TextField, optional), `hint` (CharField, displayed text), `value` (FloatField, threshold), `min_max` (CharField, "min"|"max"), `hint_level` (CharField, "info"|"warn"|"error"), `parameter` (CharField, choices from HintParameterChoices), `recipe_type` (CharField, required), `recipe_objective` (CharField, required).

#### Scenario: Minimum rule triggers
- **WHEN** a recipe's computed parameter value is below a hint's `value` where `min_max` = "min"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Maximum rule triggers
- **WHEN** a recipe's computed parameter value is above a hint's `value` where `min_max` = "max"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Required fields enforced
- **WHEN** a RecipeHint is created without `recipe_type` or `recipe_objective`
- **THEN** validation fails

### Requirement: Hint level visual differentiation in frontend
The frontend SHALL visually distinguish hint_level in RecipeImprovement cards using color coding.

#### Scenario: Warning level display
- **WHEN** a matched hint has `hint_level` = "warn"
- **THEN** the improvement card uses amber/orange styling (border and progress bar)

#### Scenario: Error level display
- **WHEN** a matched hint has `hint_level` = "error"
- **THEN** the improvement card uses red styling (border and progress bar)

#### Scenario: Info level display
- **WHEN** a matched hint has `hint_level` = "info"
- **THEN** the improvement card uses blue/gray styling

### Requirement: Hint text displayed as recommendation
The frontend SHALL display the `hint` field text as the recommendation text in improvement cards.

#### Scenario: Hint text shown
- **WHEN** a RecipeHint matches a recipe
- **THEN** the `hint` value (e.g. "viel mehr Gewicht") is displayed as the recommendation text in the improvement card

### Requirement: Ingredient list position on detail page
The recipe detail page SHALL display the ingredients section as the first content section directly below the hero area, before nutritional tags and preparation steps.

#### Scenario: User views recipe detail page
- **WHEN** a user opens a recipe detail page
- **THEN** the ingredients section is displayed directly below the hero/metadata area
- **THEN** the ingredients section appears before the nutritional tags section
- **THEN** the ingredients section appears before the preparation steps section

### Requirement: Portion display defaults to one portion
The ingredient quantities SHALL be displayed for exactly one portion by default. The header SHALL show "pro Portion" when the multiplier is 1, and "für X Portionen" when the multiplier is greater than 1.

#### Scenario: Default portion display
- **WHEN** a user opens a recipe detail page without changing portions
- **THEN** the ingredient header displays "pro Portion"
- **THEN** all quantities are shown divided by the recipe's base servings (normalized to 1 portion)

#### Scenario: Scaled portion display
- **WHEN** a user sets the portion scaler to 4
- **THEN** the ingredient header displays "für 4 Portionen"
- **THEN** all quantities are shown as 4x the single-portion amount

### Requirement: Single portion scaler location
The portion scaler control SHALL exist only in the desktop sidebar and the mobile bottom sheet. The IngredientList component MUST NOT contain an inline portion scaler.

#### Scenario: Desktop view
- **WHEN** a user views the recipe on desktop (lg breakpoint)
- **THEN** the portion scaler is visible in the sticky sidebar
- **THEN** no portion scaler is shown inside the ingredient list

#### Scenario: Mobile view
- **WHEN** a user views the recipe on mobile
- **THEN** the portion scaler is accessible via the mobile action bar bottom sheet
- **THEN** no portion scaler is shown inside the ingredient list

### Requirement: Sidebar portion scaler controls multiplier correctly
The sidebar portion scaler SHALL directly control the portion count (1, 2, 3...). Changing the value SHALL correctly scale ingredient quantities as `quantity / recipe.servings * portionCount`.

#### Scenario: Scaling up from default
- **WHEN** the recipe has base servings of 18 and user sets scaler to 3
- **THEN** each ingredient quantity is displayed as `original_quantity / 18 * 3`

#### Scenario: Scaler default value
- **WHEN** the recipe detail page loads
- **THEN** the portion scaler displays 1 as its initial value

### Requirement: Ingredient list uses larger font size
The ingredient list SHALL use `text-base` (1rem/16px) as the base font size for ingredient names and quantities instead of `text-sm` (0.875rem/14px).

#### Scenario: Visual size of ingredients
- **WHEN** a user views the ingredient list
- **THEN** ingredient names and quantities are rendered at text-base size (16px)

### Requirement: RecipeItem stores quantity per person
A RecipeItem SHALL store `quantity` as the amount per single person (1 Portion). The system SHALL NOT have a `quantity_type` field. All quantities are implicitly per-person. Since servings is always enforced as 1, quantity represents exactly what one person needs.

#### Scenario: Ingredient quantity interpretation
- **WHEN** a RecipeItem has quantity=50
- **THEN** the system interprets this as 50 units of the portion for 1 person

#### Scenario: Frontend scales for display
- **WHEN** the frontend displays a recipe for N persons
- **THEN** displayed quantity = RecipeItem.quantity × N

### Requirement: Recipe servings validation
The Recipe model SHALL enforce `servings=1` at the API level. All recipe quantities MUST be stored as per-1-portion values.

#### Scenario: API enforces servings=1 on create
- **WHEN** a recipe is created via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

#### Scenario: API enforces servings=1 on update
- **WHEN** a recipe is updated via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`
