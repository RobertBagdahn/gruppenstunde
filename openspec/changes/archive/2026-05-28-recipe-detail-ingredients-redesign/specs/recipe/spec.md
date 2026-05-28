## MODIFIED Requirements

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
