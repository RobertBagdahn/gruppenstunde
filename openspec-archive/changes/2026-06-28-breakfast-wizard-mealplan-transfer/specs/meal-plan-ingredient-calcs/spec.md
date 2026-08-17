## ADDED Requirements

### Requirement: Ingredient energy calculation includes effective portions

The system SHALL calculate energy for ingredient-based MealItems by multiplying with the meal's `effective_portions`, consistent with recipe-based items.

The formula SHALL be: `energy = (ingredient.energy_kcal / 100) × weight_g × factor × effective_portions`
where `weight_g = portion.weight_g × quantity` (resolved via measuring_unit).

#### Scenario: Ingredient item energy with effective portions
- **WHEN** a MealItem has ingredient_id=Bauernbrot (260 kcal/100g), quantity=0.14, measuring_unit_id=Scheibe (weight_g=18g), factor=1.0, and meal.effective_portions=10
- **THEN** `energy_kcal` = (260 / 100) × (18 × 0.14) × 1.0 × 10 = 65.5 kcal total

#### Scenario: Ingredient item energy without meal context
- **WHEN** `resolve_ingredient_energy_kcal` is called without `effective_portions` parameter
- **THEN** it SHALL default to `effective_portions=1.0` (backward-safe)

### Requirement: Ingredient cost calculation includes effective portions

The system SHALL calculate cost for ingredient-based MealItems by multiplying with the meal's `effective_portions`.

The formula SHALL be: `cost = (ingredient.price_per_kg / 1000) × weight_g × factor × effective_portions`

#### Scenario: Ingredient item cost with effective portions
- **WHEN** a MealItem has ingredient_id=Edamer (price_per_kg=12.50), quantity=0.5, measuring_unit=Portion (weight_g=25g), factor=1.0, effective_portions=10
- **THEN** `cost_eur` = (12.50 / 1000) × (25 × 0.5) × 1.0 × 10 = 1.56 € total

### Requirement: MealItemOut exposes quantity_g for portion display

The system SHALL compute `quantity_g` for ingredient-based MealItems as `portion.weight_g × quantity × effective_portions`. For recipe-based items, `quantity_g` SHALL be computed from the recipe's cached weight.

`MealItemOut` SHALL include `quantity_g: float | None` in the API response.

#### Scenario: Ingredient item quantity_g
- **WHEN** MealItem has quantity=0.14, measuring_unit=Scheibe (weight_g=18g), effective_portions=10
- **THEN** `quantity_g` = 18 × 0.14 × 10 = 25.2

#### Scenario: Recipe item quantity_g
- **WHEN** MealItem has recipe_id=Kaffee, with total recipe weight 200g per serving, factor=1.0, effective_portions=10
- **THEN** `quantity_g` = 200 × 1.0 × (10 / 1) = 2000

### Requirement: MealItemOut resolve_cost_eur handles ingredient items

`MealItemOut.resolve_cost_eur` SHALL return cost for ingredient-based items using `resolve_ingredient_cost_eur(item, effective_portions)`. Previously, it only handled recipe-based items.

#### Scenario: Ingredient item returns cost via API
- **WHEN** `GET /api/meal-plans/{id}/` returns a MealItem with ingredient_id set
- **THEN** `cost_eur` is not None and computed via `resolve_ingredient_cost_eur`

### Requirement: MealPlan total energy sums with effective portions

`MealOut.resolve_total_energy_kcal` SHALL compute ingredient item energy via `resolve_ingredient_energy_kcal(item, effective_portions)`, consistent with the recipe path which already multiplies by `effective_portions`.

#### Scenario: MealPlan total energy includes ingredient items
- **WHEN** a Meal has 3 ingredient items (Brot: 65.5 kcal, Käse: 120 kcal, Milch: 45 kcal) and 1 recipe item (Kaffee: 200 kcal)
- **THEN** `total_energy_kcal` = 65.5 + 120 + 45 + 200 = 430.5 kcal total
