## MODIFIED Requirements

### Requirement: Recipe portion field naming
The Recipe model SHALL use `portions` as the field name for the number of servings a recipe yields. The API, schemas, and frontend SHALL use `portions` consistently instead of `servings`.

#### Scenario: Recipe model field
- **WHEN** a Recipe is created or updated
- **THEN** the field for number of servings SHALL be named `portions` in the Python model, Pydantic schema, and Zod schema

### Requirement: MealPlan portion field naming
The MealPlan model SHALL use `portions` as the field name instead of `norm_portions`. The Meal model SHALL use `portions_override` instead of `override_portions`.

### Requirement: Game participant and location field naming
The Game model SHALL use `min_participants` and `max_participants` instead of `min_players`/`max_players`, and `location_type` instead of `play_area`.

### Requirement: Ingredient food category field
The Ingredient model SHALL use `food_category` as the field name instead of `physical_viscosity`. The `PhysicalViscosityChoices` enum SHALL be renamed to `FoodCategoryChoices` with values `SOLID` and `BEVERAGE`.