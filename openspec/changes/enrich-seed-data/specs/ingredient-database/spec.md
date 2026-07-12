## ADDED Requirements

### Requirement: Complete Nutritional Data for All Ingredients
Every ingredient in the seed data SHALL have complete macronutrient values (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g) and a price_per_kg, except for categories where zero values are scientifically correct (spices, herbs, water, vinegar).

#### Scenario: Staple food has complete data
- **WHEN** viewing ingredient "Deutsche Markenbutter"
- **THEN** energy_kcal > 0
- **AND** protein_g, fat_g, carbohydrate_g are set
- **AND** price_per_kg is set

#### Scenario: Spice has legitimate zero energy
- **WHEN** viewing ingredient "gemahlener schwarzer Pfeffer"
- **THEN** energy_kcal may be near zero (used in small quantities)
- **AND** all fields are explicitly set (not null)

#### Scenario: Water has zero price
- **WHEN** viewing ingredient "Leitungswasser"
- **THEN** energy_kcal is 0.0
- **AND** price_per_kg is 0.0 (explicitly set, not null)

### Requirement: Ingredient Name Must Be Specific
Every ingredient name SHALL be a concrete, specific product description. Generic single-word names without qualifiers are not permitted as ingredient names.

#### Scenario: Concrete name required
- **WHEN** creating or seeding an ingredient
- **THEN** name MUST include qualifiers if the base term is generic (e.g. "gemahlener schwarzer Pfeffer" not "Pfeffer")
- **AND** generic terms are handled via IngredientAlias with is_generic=True
