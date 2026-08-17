## MODIFIED Requirements

### Requirement: Ingredient nutritional values and scores
Ingredient SHALL store all nutritional values per 100g directly on the model: energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g. Scores SHALL include: nutri_score (points), nutri_class (1-5), child_score, scout_score, environmental_score, nova_score, fruit_factor.

In addition to the existing 11 macronutrient fields, the model SHALL include exactly one micronutrient: `vitamin_c_mg` (nullable FloatField, default NULL). All other vitamin and mineral fields SHALL be removed.

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed in kcal for energy
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

#### Scenario: Ingredient schema validation
- **WHEN** an ingredient is submitted via API
- **THEN** `energy_kcal` SHALL be the energy field (not `energy_kj`)
