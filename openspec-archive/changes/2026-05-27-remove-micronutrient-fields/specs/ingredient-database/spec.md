## MODIFIED Requirements

### Requirement: Ingredient nutritional fields
The Ingredient model SHALL store macronutrient fields (energy_kj, protein_g, fat_g, saturated_fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g) and exactly one micronutrient: `vitamin_c_mg`. All other vitamin and mineral fields SHALL be removed.

#### Scenario: AI ingredient import
- **WHEN** the AI service creates/enriches an ingredient
- **THEN** only macros and `vitamin_c_mg` are requested and stored

#### Scenario: Ingredient schema validation
- **WHEN** an ingredient is submitted via API
- **THEN** only macros and `vitamin_c_mg` are accepted as nutritional fields

### Requirement: DGE reference values
The DGE reference model and static data SHALL only include `vitamin_c_mg` as micronutrient reference. All other vitamin/mineral reference fields SHALL be removed.

#### Scenario: Norm portion calculation
- **WHEN** norm portion nutritional targets are calculated
- **THEN** only `vitamin_c_mg` is included as micronutrient target
