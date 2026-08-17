## MODIFIED Requirements

### Requirement: Ingredient inherits from Supply
Ingredient SHALL inherit from the abstract Supply base class. All existing Ingredient fields SHALL be preserved. The model SHALL live in the `supply` app. `price_per_kg` (DecimalField) SHALL be the sole price field — no separate Price model.

#### Scenario: Ingredient has price_per_kg as only price field
- **WHEN** an Ingredient is created or updated
- **THEN** `price_per_kg` SHALL be settable directly on the Ingredient
- **THEN** there SHALL be no separate Price model or Price table

#### Scenario: Ingredient migration to supply app
- **WHEN** the migration runs
- **THEN** all Ingredient data SHALL be preserved in the supply.Ingredient table
- **THEN** all ForeignKey references (from Portion, RecipeItem, etc.) SHALL be updated

### Requirement: Portion and Price relationship simplified
Portion SHALL reference Ingredient directly. The Price model SHALL be removed entirely. Ingredient SHALL store its price via the `price_per_kg` field.

#### Scenario: Portion for supply.Ingredient
- **WHEN** a Portion is created for an Ingredient
- **THEN** it SHALL reference supply.Ingredient
- **THEN** all weight conversion and measuring unit logic SHALL remain unchanged

#### Scenario: Price calculation from Ingredient
- **WHEN** a recipe's price needs to be calculated
- **THEN** the system SHALL use `Ingredient.price_per_kg * weight_g / 1000` for each RecipeItem
- **THEN** no Price model lookup SHALL be needed

### Requirement: Ingredient synonyms (aliases)
IngredientAlias SHALL remain directly linked to Ingredient. The model stores alternative names for search and display purposes.

#### Scenario: Searching by synonym
- **WHEN** a user searches for "Tomate"
- **THEN** the search SHALL also match IngredientAlias entries (e.g., "Paradeiser")
- **THEN** the Ingredient detail page SHALL display all aliases

### Requirement: Ingredient nutritional values and scores
Ingredient SHALL store all nutritional values per 100g directly on the model: energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g. Scores SHALL include: nutri_score (points), nutri_class (1-5), child_score, scout_score, environmental_score, nova_score, fruit_factor.

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

## REMOVED Requirements

### Requirement: Price model
**Reason**: Replaced by single `price_per_kg` field directly on Ingredient. User decided one price per ingredient is sufficient.
**Migration**: Best price from existing Price entries has already been cascaded to `Ingredient.price_per_kg`. Price table SHALL be dropped.

### Requirement: Price cascade service
**Reason**: No longer needed since there is only one price per ingredient.
**Migration**: `price_service.py` SHALL be simplified to only provide `get_portion_price(ingredient, weight_g)` = `price_per_kg * weight_g / 1000`.

## ADDED Requirements

### Requirement: Supply-aware AI autocomplete
The AI autocomplete for ingredient data SHALL also suggest Material entries when relevant.

#### Scenario: AI suggests kitchen equipment
- **WHEN** a user creates a Recipe and the AI analyzes the description
- **THEN** the AI MAY suggest relevant Materials (kitchen equipment) in addition to Ingredients
- **THEN** suggested Materials SHALL appear in the "Kuechengeraete" section
