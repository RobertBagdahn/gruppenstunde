## MODIFIED Requirements

### Requirement: Recipe servings validation
The Recipe model SHALL enforce `servings=1` at the API level. All recipe quantities MUST be stored as per-1-portion values. The `servings` field exists with default=1 but the API SHALL always save it as 1 regardless of client input.

#### Scenario: API enforces servings=1 on create
- **WHEN** a recipe is created via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

#### Scenario: API enforces servings=1 on update
- **WHEN** a recipe is updated via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

### Requirement: RecipeItem stores quantity per person
A RecipeItem SHALL store `quantity` as the amount per single person (1 Portion). The system SHALL NOT have a `quantity_type` field. All quantities are implicitly per-person. Since servings is always 1, quantity represents exactly what one person needs.

#### Scenario: Ingredient quantity interpretation
- **WHEN** a RecipeItem has quantity=50
- **THEN** the system interprets this as 50 units of the portion for 1 person

#### Scenario: Frontend scales for display
- **WHEN** the frontend displays a recipe for N persons
- **THEN** displayed quantity = RecipeItem.quantity × N
