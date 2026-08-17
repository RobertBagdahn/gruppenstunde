## ADDED Requirements

### Requirement: Vitamin fields on Ingredient model
The system SHALL store 13 vitamin values per Ingredient as nullable FloatFields (per 100g):
- `vitamin_a_mg` (Retinol-Äquivalent)
- `vitamin_b1_mg` (Thiamin)
- `vitamin_b2_mg` (Riboflavin)
- `vitamin_b6_mg` (Pyridoxin)
- `vitamin_b12_ug` (Cobalamin, in Mikrogramm)
- `vitamin_c_mg` (Ascorbinsäure)
- `vitamin_d_ug` (Calciferol, in Mikrogramm)
- `vitamin_e_mg` (Tocopherol)
- `vitamin_k_ug` (Phyllochinon, in Mikrogramm)
- `niacin_mg` (Vitamin B3)
- `folate_ug` (Folat/Folsäure, in Mikrogramm)
- `pantothenic_acid_mg` (Pantothensäure, Vitamin B5)
- `biotin_ug` (Vitamin B7, in Mikrogramm)

All fields SHALL default to NULL (unknown) rather than 0 (zero content).

#### Scenario: Ingredient with complete vitamin data
- **WHEN** an Ingredient has all 13 vitamin fields populated
- **THEN** all values SHALL be returned in the API response as floats

#### Scenario: Ingredient with partial vitamin data
- **WHEN** an Ingredient has only some vitamin fields populated
- **THEN** populated fields SHALL return their float values and unpopulated fields SHALL return null

### Requirement: Mineral fields on Ingredient model
The system SHALL store 12 mineral values per Ingredient as nullable FloatFields (per 100g):
- `calcium_mg`
- `iron_mg` (Eisen)
- `magnesium_mg`
- `zinc_mg` (Zink)
- `potassium_mg` (Kalium)
- `phosphorus_mg` (Phosphor)
- `iodine_ug` (Jod, in Mikrogramm)
- `selenium_ug` (Selen, in Mikrogramm)
- `copper_mg` (Kupfer)
- `manganese_mg` (Mangan)
- `chromium_ug` (Chrom, in Mikrogramm)
- `fluoride_mg` (Fluorid)

All fields SHALL default to NULL (unknown) rather than 0 (zero content).

#### Scenario: Ingredient with mineral data
- **WHEN** an Ingredient has mineral fields populated
- **THEN** all populated values SHALL be returned in the API response

### Requirement: DGE reference values as database model
The system SHALL provide a `DgeReference` model in the supply app with the following fields:
- `age_min` (IntegerField) — Lower bound of age group
- `age_max` (IntegerField) — Upper bound of age group
- `gender` (CharField) — "male" or "female"
- All macronutrient reference values: energy_kj, protein_g, fat_g, carbohydrate_g, fibre_g
- All vitamin reference values: vitamin_a_mg, vitamin_b1_mg, vitamin_b2_mg, vitamin_b6_mg, vitamin_b12_ug, vitamin_c_mg, vitamin_d_ug, vitamin_e_mg, vitamin_k_ug, niacin_mg, folate_ug, pantothenic_acid_mg, biotin_ug
- All mineral reference values: calcium_mg, iron_mg, magnesium_mg, zinc_mg, potassium_mg, phosphorus_mg, iodine_ug, selenium_ug, copper_mg, manganese_mg, chromium_ug, fluoride_mg
- `sugar_g_max` (FloatField) — Maximum recommended sugar per day
- `salt_g_max` (FloatField) — Maximum recommended salt per day
- `fat_sat_g_max` (FloatField) — Maximum recommended saturated fat per day
- `sodium_mg_max` (FloatField) — Maximum recommended sodium per day

The model SHALL be admin-manageable and initially seeded with official DGE D-A-CH reference values.

#### Scenario: Retrieve DGE reference for age group
- **WHEN** querying DGE references for age 14 and gender "male"
- **THEN** the system SHALL return the matching age group (13-14) reference values

#### Scenario: List all DGE references via API
- **WHEN** a GET request is made to `/api/dge-references/`
- **THEN** the system SHALL return all DGE reference entries as a flat list

#### Scenario: Admin edits DGE reference
- **WHEN** an admin modifies a DGE reference value in the Django admin
- **THEN** the updated value SHALL be used in all subsequent DGE calculations

### Requirement: Denormalized vitamin/mineral cache on Recipe
The system SHALL maintain denormalized cache fields on Recipe for the 10 most important micronutrients (per serving, aggregated from RecipeItems):
- `cached_vitamin_a_mg`, `cached_vitamin_c_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`
- `cached_calcium_mg`, `cached_iron_mg`, `cached_magnesium_mg`, `cached_zinc_mg`, `cached_potassium_mg`
- `cached_folate_ug`

These cache fields SHALL be recalculated whenever a RecipeItem is added, updated, or deleted.

#### Scenario: Recipe cache recalculation
- **WHEN** a RecipeItem is saved or deleted on a Recipe with Ingredients that have vitamin/mineral data
- **THEN** the Recipe's `cached_vitamin_*` and `cached_mineral_*` fields SHALL be recalculated by summing the weighted values from all RecipeItems

#### Scenario: Ingredient with missing micronutrient data
- **WHEN** a RecipeItem references an Ingredient where some vitamin/mineral fields are NULL
- **THEN** those NULL fields SHALL be excluded from the sum (treated as 0 for aggregation purposes) and the cache field SHALL reflect only the known values

### Requirement: Extended nutrition breakdown API
The nutrition breakdown endpoint (`GET /api/recipes/{id}/nutrition-breakdown/`) SHALL include vitamin and mineral data in addition to macronutrients. Each RecipeItemNutritionOut SHALL include all 25 micronutrient fields (vitamins + minerals). The totals SHALL include per-serving values and DGE percentage coverage.

#### Scenario: Nutrition breakdown with DGE coverage
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/` with optional query parameter `age=14&gender=male`
- **THEN** the response SHALL include a `dge_coverage` object with percentage values for each nutrient relative to the DGE reference for the specified age/gender group

#### Scenario: Nutrition breakdown without age parameter
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/` without age/gender parameters
- **THEN** the response SHALL use the default age group 13-14 male (typical Pfadfinder) for DGE coverage calculation
