## MODIFIED Requirements

### Requirement: All recipes MUST have servings=1
The system SHALL store every recipe with `portions=1`. `RecipeItem.quantity` SHALL represent the amount for one portion, and the system SHALL NOT provide a `quantity_type` field. Recipe creation, update, and import flows SHALL normalize source serving counts before saving.

#### Scenario: API normalizes portions
- **WHEN** a client submits a recipe with `portions` greater than 1
- **THEN** the saved recipe has `portions=1` and normalized item quantities

#### Scenario: Import normalizes source servings
- **WHEN** an importer receives a source recipe with `servings=4`
- **THEN** it divides imported quantities by 4 and stores the recipe with `portions=1`

#### Scenario: Legacy data is normalized
- **WHEN** the normalization command runs
- **THEN** all legacy recipes are converted to `portions=1` and their caches are recalculated
