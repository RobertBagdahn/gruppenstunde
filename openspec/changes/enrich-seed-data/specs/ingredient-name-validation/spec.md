## ADDED Requirements

### Requirement: Generic Names Prohibited as Ingredient Names
Generic single-word food names without qualifiers SHALL NOT be used as ingredient names in the seed data. Such names indicate incomplete data and are replaced with concrete, specific names during enrichment.

#### Scenario: Generic name flagged during enrichment
- **WHEN** enrich_seeds processes an ingredient named "Salz" with energy_kcal=0
- **THEN** the ingredient is classified as "needs renaming"
- **AND** is matched against the IngredientSpec knowledge base
- **AND** renamed to the concrete canonical name (e.g., "Jodsalz")

#### Scenario: Generic name with data kept as alias
- **WHEN** ingredient "Milch" has complete nutritional data (energy_kcal=65)
- **THEN** the ingredient may be kept but the generic name "Milch" becomes an alias
- **AND** the ingredient name is updated to be more specific if possible (e.g., "Kuhmilch 3,5 % Fett")
