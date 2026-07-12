## ADDED Requirements

### Requirement: Enrichment Management Command
The system SHALL provide a Django management command `enrich_seeds` that imports all food fixture data into a temporary SQLite database, enriches it via Django ORM, and exports clean fixtures via `dumpdata`.

#### Scenario: Full enrichment pipeline
- **WHEN** `uv run python manage.py enrich_seeds` is executed
- **THEN** the command imports all `backend/data/food/*.json` fixtures into a temporary SQLite database
- **AND** runs all Django migrations on the SQLite database
- **AND** enriches ingredients, portions, aliases, and recipe caches via ORM
- **AND** exports enriched data to `backend/data/food/` using `dumpdata`
- **AND** overwrites all existing food fixture files
- **AND** outputs a summary report with counts of changes

#### Scenario: Idempotent re-run
- **WHEN** `enrich_seeds` runs a second time on already enriched data
- **THEN** already-enriched ingredients (non-generic name, energy_kcal > 0, sensible rank-1 portion) are skipped
- **AND** no duplicate aliases or portions are created
- **AND** the summary report shows zero changes

### Requirement: Ingredient Name Concretization
The system SHALL rename ingredients with generic single-word names to specific, concrete names using the IngredientSpec knowledge base.

#### Scenario: Generic ingredient renamed
- **WHEN** an ingredient with name "Salz" and energy_kcal=0 exists in the database
- **AND** IngredientSpec maps "Salz" → "Jodsalz"
- **THEN** the ingredient name is changed to "Jodsalz"
- **AND** the slug is regenerated from the new name
- **AND** all FK references (RecipeItem, Portion, Alias) remain intact

#### Scenario: Already concrete ingredient unchanged
- **WHEN** an ingredient with name "Jodsalz" already exists
- **AND** it has non-zero energy_kcal and sensible portions
- **THEN** the ingredient is skipped during name concretization
- **AND** its data is not modified

### Requirement: Nutritional Value Enrichment
The system SHALL fill missing nutritional values using a priority chain: REWE product data → BLS reference → AI estimation with range validation.

#### Scenario: Nutrient filled from REWE data
- **WHEN** ingredient "Gouda jung" has energy_kcal=0 and nan_art_id_rewe is set
- **AND** the REWE-scraped data for this product contains energy_kcal=356
- **THEN** energy_kcal is set to 356
- **AND** all other available REWE nutrient fields are filled

#### Scenario: Nutrient estimated by AI with range check
- **WHEN** no REWE or BLS data is available for a nutrient
- **THEN** Gemini AI estimates the value
- **AND** the value is validated against allowed ranges (energy_kcal 0-900, protein 0-100, etc.)
- **AND** values outside ranges are set to null

#### Scenario: Nutrient validation rejects invalid AI estimate
- **WHEN** AI estimates energy_kcal=1200 for any food
- **THEN** the value is rejected (exceeds max 900)
- **AND** the field remains null

### Requirement: Portion Cleanup
The system SHALL remove nonsensical portions and ensure all ingredients have plausible rank-1 portions.

#### Scenario: Nonsensical portion removed
- **WHEN** an ingredient has a portion with name "ml" but physical_viscosity is "solid"
- **THEN** the portion is deleted
- **AND** if any RecipeItem references it, the RecipeItem is rebound to the new rank-1 portion

#### Scenario: Sensible portion kept
- **WHEN** an ingredient has a portion named "1 Prise Salz" with weight_g=0.3
- **THEN** the portion is kept

#### Scenario: Rank-9999 sentinel removed
- **WHEN** a portion has rank=9999
- **THEN** it is deleted and replaced with a new "g" (1g) portion at rank=9999

#### Scenario: RecipeItem rebound after portion deletion
- **WHEN** a portion with name "ml" is deleted from ingredient "Salz"
- **AND** a RecipeItem references this portion
- **THEN** the RecipeItem.portion is set to the new rank-1 portion
- **AND** RecipeItem.quantity remains unchanged

### Requirement: Generic Alias Generation
The system SHALL generate ~70-90 `is_generic=True` aliases, distributed 1:N to all matching concrete ingredients.

#### Scenario: Generic alias distributed to multiple ingredients
- **WHEN** the generic term "Salz" exists
- **AND** concrete ingredients "Jodsalz", "Meersalz", and "Steinsalz" exist
- **THEN** an IngredientAlias with name="Salz" and is_generic=True is created on each of the three ingredients
- **AND** each alias has a unique rank within its ingredient

#### Scenario: All existing aliases replaced
- **WHEN** enrich_seeds runs for the first time
- **THEN** all existing IngredientAlias records are deleted
- **AND** new aliases are generated entirely from the IngredientSpec knowledge base

### Requirement: REWE Product Alias Preservation
The system SHALL keep REWE-scraped products as standalone ingredients and create non-generic aliases linking them to curated canonical ingredients.

#### Scenario: REWE product aliased to canonical ingredient
- **WHEN** REWE product "REWE Beste Wahl Gouda jung am Stück 48%" exists
- **AND** canonical ingredient "Gouda jung 48% F.i.Tr." exists
- **THEN** the REWE product remains as a standalone ingredient
- **AND** a non-generic alias is created from the REWE product name to the canonical ingredient

### Requirement: Recipe Cache Recalculation
The system SHALL recalculate all recipe nutritional caches using the production `recalculate_recipe_cache()` function after enrichment.

#### Scenario: Recipe cache updated after ingredient enrichment
- **WHEN** ingredient "Butter" gets energy_kcal changed from 0 to 717
- **AND** Recipe "Pfannkuchen" uses Butter as an ingredient
- **THEN** after enrichment, the recipe's cached_energy_kcal reflects the new Butter value
- **AND** cached_protein_g, cached_fat_g, etc. are updated accordingly

#### Scenario: Empty recipe handled
- **WHEN** a recipe has no RecipeItems
- **THEN** its cached_weight_g is 0.0
- **AND** its cached_price_total is null
- **AND** its cached_energy_total_kcal is null

### Requirement: Embedding Regeneration
The system SHALL regenerate pgvector embeddings for all 5,743 ingredients via the Gemini text-embedding API and store them in the custom embedding fixture format.

#### Scenario: Embedding regenerated for renamed ingredient
- **WHEN** ingredient "Pfeffer" is renamed to "gemahlener schwarzer Pfeffer"
- **AND** embeddings are regenerated
- **THEN** the new embedding is computed from "gemahlener schwarzer Pfeffer" + description text
- **AND** stored in supply_ingredient_embeddings.json with the ingredient's PK

### Requirement: Structural Fixes
The system SHALL fix structural data issues: physical_viscosity, physical_density, and nutri_score/nutri_class.

#### Scenario: Viscosity corrected for liquids
- **WHEN** ingredient "Kuhmilch 3,5 % Fett" has physical_viscosity="solid"
- **AND** IngredientSpec specifies physical_viscosity="liquid"
- **THEN** physical_viscosity is changed to "liquid"

#### Scenario: Nutri-score calculated
- **WHEN** ingredient "Jodsalz" has nutri_score=null and nutri_class=null
- **AND** it receives complete nutritional values from enrichment
- **THEN** calculate_nutri_score() computes and sets both nutri_score and nutri_class

### Requirement: Enrichment Report
The system SHALL output a summary report with counts of all changes made during enrichment.

#### Scenario: Report generated after enrichment
- **WHEN** enrich_seeds completes
- **THEN** a report is written to stdout containing:
- **AND** count of ingredients renamed
- **AND** count of nutritional values filled
- **AND** count of portions deleted
- **AND** count of portions created
- **AND** count of aliases created
- **AND** count of recipe caches updated
- **AND** count of embeddings regenerated
- **AND** count of ingredients skipped (already enriched)
- **AND** count of ingredients left unmatched

#### Scenario: Report on idempotent re-run
- **WHEN** enrich_seeds runs on already enriched data
- **THEN** all counts except "skipped" are zero
