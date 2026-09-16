## ADDED Requirements

### Requirement: Direct recipe ingredient replacement
The system SHALL provide an authenticated, permission-checked endpoint to replace one RecipeItem with a selected portion belonging to another ingredient.

#### Scenario: Successful replacement
- **WHEN** an editor posts a valid target portion to `POST /api/recipes/{recipe_id}/items/{item_id}/replace/`
- **THEN** the existing RecipeItem SHALL reference the target portion
- **THEN** its ID, sort order, note, optional flag and step assignments SHALL remain intact where valid
- **THEN** recipe caches SHALL be recalculated

#### Scenario: Unauthenticated replacement
- **WHEN** an unauthenticated user calls the replacement endpoint
- **THEN** the system SHALL return HTTP 403

#### Scenario: Target portion belongs to another ingredient
- **WHEN** the target portion does not belong to the requested replacement ingredient or is inactive
- **THEN** the system SHALL return HTTP 422 or 404
- **THEN** the original RecipeItem SHALL remain unchanged

### Requirement: Replacement preserves technical quantity
The replacement service SHALL preserve the existing technical gram amount when both source and target portions have trusted weights; otherwise it SHALL require an explicit quantity choice.

#### Scenario: Equal gram basis
- **WHEN** `5 g Salz` is replaced by a `Jodsalz` portion with `weight_g=1`
- **THEN** the resulting item SHALL represent approximately `5 g Jodsalz`

#### Scenario: Unsafe conversion
- **WHEN** the target portion has no trusted weight
- **THEN** the response SHALL require the user to select or confirm a target quantity
