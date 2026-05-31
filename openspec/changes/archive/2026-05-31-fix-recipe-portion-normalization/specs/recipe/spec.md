## MODIFIED Requirements

### Requirement: Recipe servings validation
The Recipe model SHALL enforce `servings=1` at the API level. All recipe quantities MUST be stored as per-1-portion values.

#### Scenario: API enforces servings=1 on create
- **WHEN** a recipe is created via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

#### Scenario: API enforces servings=1 on update
- **WHEN** a recipe is updated via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`
