# recipe-portion-normalization Delta Spec

## MODIFIED Requirements

### Requirement: All recipes MUST have servings=1

The system SHALL store all recipe quantities as per-1-portion values. The `Recipe.portions` field MUST always be `1`. All `RecipeItem.quantity` values represent the amount needed for exactly one portion. The Create-Recipe UI SHALL NOT show an editable portions field — `portions: 1` is always sent to the API.

#### Scenario: Create recipe always sends portions=1
- **WHEN** a user creates a recipe via the UI
- **THEN** the API request SHALL contain `portions: 1`
- **THEN** the UI SHALL NOT display an editable Portionen input field in Step 0

#### Scenario: Recipe import sends servings as portions
- **WHEN** a recipe is imported from URL with `recipe_draft.servings` field
- **THEN** the CreatePage SHALL read `servings` (not `portions`) from the response
- **THEN** quantities SHALL be normalized to 1 portion if `servings > 1`

#### Scenario: Backend API enforces servings=1
- **WHEN** a client sends a recipe create request with `portions=4`
- **THEN** the saved recipe SHALL have `portions=1`

#### Scenario: Backend API enforces servings=1 on update
- **WHEN** a client sends a recipe update request with `portions=2`
- **THEN** the saved recipe SHALL have `portions=1`

### Requirement: Backend API enforces servings=1

The Recipe Create and Update API endpoints SHALL always set `portions=1` on the saved recipe, regardless of the value submitted by the client.

#### Scenario: Create recipe with portions > 1
- **WHEN** a client sends a recipe create request with `portions=4`
- **THEN** the saved recipe SHALL have `portions=1`

#### Scenario: Update recipe with portions > 1
- **WHEN** a client sends a recipe update request with `portions=2`
- **THEN** the saved recipe SHALL have `portions=1`
