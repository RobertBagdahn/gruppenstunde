## MODIFIED Requirements

### Requirement: New Ingredient Data Completeness
When creating a new Ingredient via URL import, the system SHALL populate the following fields using Gemini + Google Search Grounding:
- Nutritional values per 100g: energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g
- Scores: child_score, scout_score, environmental_score, nova_score, nutri_score, nutri_class
- Physical properties: physical_density, physical_viscosity
- Aliases (IngredientAlias records)
- At least one Portion record (e.g. "Stück" with weight_g)

#### Scenario: All nutritional fields populated
- **WHEN** a new ingredient is created from URL import
- **THEN** all mandatory nutritional fields (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g) SHALL be non-null
- **THEN** `energy_kcal` SHALL contain the energy value in kcal (not kJ)
