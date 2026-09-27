# cooklang-ingredient-autocreate Specification

## Purpose
Zutaten, die beim Cooklang-Import fehlen, werden automatisch angelegt.
## Requirements
### Requirement: Auto-create Ingredient on Cooklang import
When the Cooklang import encounters an ingredient name not found in the database, it SHALL create a new Ingredient record with `status=draft` and a default Portion with `weight_g=1.0`.

#### Scenario: Unknown ingredient in .cook file
- **WHEN** `import_cooklang` parses `@veganer Quark{100%g}` and no Ingredient with name "veganer Quark" exists
- **THEN** a new Ingredient is created with `name="veganer Quark"`, `slug="veganer-quark"`, `status="draft"`, and a Portion with `measuring_unit=Gramm`, `weight_g=1.0`

#### Scenario: Known ingredient in .cook file
- **WHEN** `import_cooklang` parses `@Salz{1%Prise}` and Ingredient "Salz" already exists
- **THEN** the existing Ingredient is used, no new record created

### Requirement: RecipeItem always linked to Ingredient
Every RecipeItem created by the Cooklang import MUST have a non-null `ingredient` field.

#### Scenario: All items linked after import
- **WHEN** the Cooklang import completes
- **THEN** zero RecipeItems exist with `ingredient=None` for recipes imported from Cooklang

### Requirement: Frontend displays non-weight units directly
When a RecipeItem's measuring_unit is not a weight (g/kg) or volume (ml/l) unit, the frontend SHALL display quantity + unit name without gram conversion.

#### Scenario: Stück-based ingredient display
- **WHEN** a RecipeItem has `quantity=1`, `measuring_unit="Stück"`, `ingredient_name="Paprika"`
- **THEN** the display shows "1 Stück" followed by "Paprika", not "0 g Paprika"

#### Scenario: Weight-based ingredient display
- **WHEN** a RecipeItem has `quantity=100`, `measuring_unit="Gramm"`
- **THEN** the display uses `formatQuantity()` as before (showing "100 g")

### Requirement: Small quantities not rounded to zero
The `smartRound` function MUST NOT round values > 0 to 0.

#### Scenario: Quantity of 1 gram
- **WHEN** `smartRound(1)` is called
- **THEN** it returns 1, not 0

#### Scenario: Quantity of 2.5 grams
- **WHEN** `smartRound(2.5)` is called
- **THEN** it returns 3 (Math.round), not 0
