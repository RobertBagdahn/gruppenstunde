## MODIFIED Requirements

### Requirement: Recipe denormalized cache fields
The Recipe model SHALL maintain denormalized cache fields for fast list-view queries. In addition to the existing 8 cached macronutrient fields, the model SHALL include 10 cached micronutrient fields:
- `cached_vitamin_a_mg` (FloatField, nullable)
- `cached_vitamin_c_mg` (FloatField, nullable)
- `cached_vitamin_d_ug` (FloatField, nullable)
- `cached_vitamin_b12_ug` (FloatField, nullable)
- `cached_calcium_mg` (FloatField, nullable)
- `cached_iron_mg` (FloatField, nullable)
- `cached_magnesium_mg` (FloatField, nullable)
- `cached_zinc_mg` (FloatField, nullable)
- `cached_potassium_mg` (FloatField, nullable)
- `cached_folate_ug` (FloatField, nullable)

The `recalculate_recipe_cache()` function SHALL aggregate these values from RecipeItems and store them on the Recipe.

#### Scenario: Recipe cache includes micronutrients
- **WHEN** a RecipeItem is saved on a recipe where the ingredient has vitamin_c_mg=53.0 and calcium_mg=120
- **THEN** the Recipe's cached_vitamin_c_mg and cached_calcium_mg SHALL be recalculated

#### Scenario: Recipe list includes cached micronutrients
- **WHEN** a GET request is made to `/api/recipes/`
- **THEN** each recipe in the response SHALL include the 10 cached micronutrient fields (may be null)

### Requirement: Extended nutrition breakdown with DGE coverage
The nutrition breakdown endpoint SHALL include micronutrient data and DGE reference coverage percentages.

The `RecipeNutritionBreakdownOut` SHALL include:
- All existing macronutrient totals
- New micronutrient totals: total_vitamin_a_mg, total_vitamin_c_mg, total_vitamin_d_ug, total_vitamin_b12_ug, total_calcium_mg, total_iron_mg, total_magnesium_mg, total_zinc_mg, total_potassium_mg, total_folate_ug
- Per-serving values for all micronutrients
- A `dge_coverage` object mapping each nutrient to a percentage of daily reference value

The `RecipeItemNutritionOut` SHALL include all 25 micronutrient fields per item.

#### Scenario: Nutrition breakdown with micronutrients
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/`
- **THEN** the response SHALL include total and per-serving values for all vitamins and minerals

#### Scenario: DGE coverage calculation
- **WHEN** a recipe has per-serving vitamin_c_mg=30 and the DGE reference for age 14 male is 90mg
- **THEN** the dge_coverage SHALL include `vitamin_c_mg: 33.3` (percentage)

### Requirement: Recipe hints include improvement text
The `RecipeHintMatchOut` schema SHALL include an `improvement_text` field with concrete improvement suggestions. The hint matching logic SHALL support the new vitamin and mineral parameters in addition to existing macronutrient parameters.

#### Scenario: Matched hint includes improvement text
- **WHEN** a recipe triggers a hint for low fibre
- **THEN** the API response SHALL include both the hint name/description and the improvement_text with a concrete suggestion

#### Scenario: Vitamin hint matching
- **WHEN** a recipe has `vitamin_c_mg < 10` per serving and a vitamin_c RecipeHint exists
- **THEN** the system SHALL match the vitamin C hint and return it in the hints response
