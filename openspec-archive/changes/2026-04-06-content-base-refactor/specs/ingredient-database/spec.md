## MODIFIED Requirements

### Requirement: Ingredient inherits from Supply
Ingredient SHALL inherit from the abstract Supply base class. All existing Ingredient fields SHALL be preserved. The model SHALL move from the `idea` app to the `supply` app.

#### Scenario: Ingredient migration to supply app
- **WHEN** the migration runs
- **THEN** all Ingredient data SHALL be preserved in the new supply.Ingredient table
- **THEN** all ForeignKey references (from Portion, RecipeItem, etc.) SHALL be updated

### Requirement: is_standalone_food flag
Ingredient SHALL have a BooleanField `is_standalone_food` (default False) that marks ingredients that can be consumed raw without preparation (e.g., apple, carrot, bread).

#### Scenario: Standalone food in recipe search
- **WHEN** a search is performed in the recipe context
- **THEN** Ingredients with is_standalone_food=True SHALL appear as results with a "Einzelzutat" badge
- **THEN** clicking SHALL navigate to `/ingredients/:slug`

### Requirement: Ingredient purchase links
Ingredient SHALL support purchase links via the Supply base class purchase_links mechanism. Each link SHALL contain: url, shop_name, price, currency, last_checked.

#### Scenario: Viewing purchase links for ingredient
- **WHEN** a user views an Ingredient detail page
- **THEN** purchase links SHALL be displayed alongside price/portion information

### Requirement: Portion and Price remain linked to Ingredient
Portion and Price models SHALL continue to reference Ingredient, but from the supply app. The relationship pattern SHALL remain the same.

#### Scenario: Portion for supply.Ingredient
- **WHEN** a Portion is created for an Ingredient
- **THEN** it SHALL reference supply.Ingredient instead of idea.Ingredient
- **THEN** all weight conversion and measuring unit logic SHALL remain unchanged

## ADDED Requirements

### Requirement: Supply-aware AI autocomplete
The AI autocomplete for ingredient data SHALL also suggest Material entries when relevant (e.g., suggesting "Schneidebrett" when creating a recipe that involves chopping).

#### Scenario: AI suggests kitchen equipment
- **WHEN** a user creates a Recipe and the AI analyzes the description
- **THEN** the AI MAY suggest relevant Materials (kitchen equipment) in addition to Ingredients
- **THEN** suggested Materials SHALL appear in the "Küchengeräte" section
