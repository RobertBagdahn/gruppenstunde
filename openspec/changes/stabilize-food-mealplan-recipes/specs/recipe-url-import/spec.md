# recipe-url-import Delta Spec

## MODIFIED Requirements

### Requirement: Recipe Import from URL Endpoint

The system SHALL provide a `POST /api/recipes/import-from-url-enhanced/` endpoint that accepts a JSON body with a `url` field and returns a parsed recipe preview with matched/created ingredients. The response SHALL include `recipe_draft.servings` (number of servings of the original recipe).

#### Scenario: Successful import returns servings field
- **WHEN** a user submits a URL containing valid recipe data
- **THEN** the response SHALL include `recipe_draft.servings` with the detected serving count
- **THEN** the response SHALL include `recipe_items` with matched ingredients and quantity/unit data

### Requirement: Frontend reads servings from import response

The CreateRecipePage SHALL read `data.recipe_draft.servings` (not `portions`) from the import response for portion normalization. The Zod schema `RecipeDraftSchema` SHALL use `servings` as the field name.

#### Scenario: Import normalizes quantities from servings
- **WHEN** an imported recipe has `servings: 4` and the user confirms normalization to 1 portion
- **THEN** all ingredient quantities SHALL be divided by `detectedServings` (4)
- **THEN** the recipe SHALL be saved with `portions: 1`

#### Scenario: Import with servings=1
- **WHEN** an imported recipe has `servings: 1`
- **THEN** the normalization dialog SHALL NOT be shown
- **THEN** quantities SHALL be used as-is
