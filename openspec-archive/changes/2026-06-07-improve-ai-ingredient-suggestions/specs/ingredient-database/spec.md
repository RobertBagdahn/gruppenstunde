## MODIFIED Requirements

### Requirement: Ingredient nutritional values and scores
Ingredient SHALL store all nutritional values per 100g directly on the model: energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g. Scores SHALL include: nutri_score (points), nutri_class (1-5), child_score, scout_score, environmental_score, nova_score, fruit_factor.

In addition to the existing 11 macronutrient fields, the model SHALL include exactly one micronutrient: `vitamin_c_mg` (nullable FloatField, default NULL). All other vitamin and mineral fields SHALL be removed.

The model SHALL also include six Pfadfinder-relevant fields:
- `storage_type` (CharField, choices: dry/refrigerated/frozen/ambient, nullable, default NULL)
- `cooking_factor` (FloatField, default=1.0, nullable)
- `camp_suitable` (BooleanField, default=False)
- `preparation_time_min` (IntegerField, nullable, default NULL)
- `season_start` (IntegerField, nullable, 1–12, default NULL)
- `season_end` (IntegerField, nullable, 1–12, default NULL)

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

#### Scenario: Ingredient with scout fields
- **WHEN** an Ingredient with scout field values is viewed
- **THEN** storage_type SHALL be displayed as the German label (e.g. "Kühlschrank")
- **THEN** cooking_factor SHALL be displayed as "aus 100g roh → {X}g gekocht"
- **THEN** camp_suitable SHALL display a badge/icon when true
- **THEN** preparation_time_min SHALL be displayed as "{X} Min." when set
- **THEN** season SHALL be displayed as month range or "ganzjährig"

#### Scenario: AI ingredient import
- **WHEN** the AI service creates/enriches an ingredient
- **THEN** macros, vitamin_c_mg, and all scout fields are requested and stored

#### Scenario: Ingredient schema validation
- **WHEN** an ingredient is submitted via API
- **THEN** macros, vitamin_c_mg, and all scout fields are accepted as valid fields

## ADDED Requirements

### Requirement: Scout field display on ingredient detail page
The `IngredientDetailPage` SHALL display all six scout fields in an organized section (grouped with physical properties or in their own "Lager & Pfadfinder" section).

#### Scenario: Scout fields section visible
- **WHEN** viewing an ingredient detail page
- **THEN** the scout fields (storage_type, cooking_factor, camp_suitable, preparation_time_min, season_start/end) SHALL be displayed
- **THEN** fields with NULL values SHALL be hidden or shown as "–"

#### Scenario: camp_suitable indicator
- **WHEN** an ingredient has `camp_suitable=true`
- **THEN** a tent/camp icon or badge SHALL be displayed near the ingredient name
