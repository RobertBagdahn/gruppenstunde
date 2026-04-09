## MODIFIED Requirements

### Requirement: Recipe Model inherits from Content
Recipe SHALL inherit from the abstract `Content` base class. All existing Recipe-specific fields (recipe_type, servings) SHALL be preserved. Recipe SHALL additionally have denormalized cache fields for aggregated nutritional values per Normportion: `cached_energy_kj` (FloatField, nullable), `cached_protein_g` (FloatField, nullable), `cached_fat_g` (FloatField, nullable), `cached_carbohydrate_g` (FloatField, nullable), `cached_sugar_g` (FloatField, nullable), `cached_fibre_g` (FloatField, nullable), `cached_salt_g` (FloatField, nullable), `cached_nutri_class` (IntegerField 1-5, nullable), `cached_price_total` (DecimalField, nullable), `cached_at` (DateTimeField, nullable).

#### Scenario: Recipe has all Content fields and cache fields
- **WHEN** a Recipe is created
- **THEN** it SHALL have all Content base fields (title, slug, summary, description, tags, scout_levels, authors, embedding, etc.)
- **THEN** it SHALL have recipe-specific fields (recipe_type, servings)
- **THEN** it SHALL have all cached nutritional fields (initially null)

#### Scenario: Cache fields populated on RecipeItem change
- **WHEN** a RecipeItem is added, modified, or deleted from a Recipe
- **THEN** the Recipe's cached nutritional fields SHALL be recalculated
- **THEN** `cached_at` SHALL be set to the current timestamp
- **THEN** the calculation SHALL aggregate all RecipeItem nutritional values per Normportion (based on servings)

#### Scenario: Cache fields invalidated on Ingredient change
- **WHEN** an Ingredient's nutritional values or price_per_kg are updated
- **THEN** all Recipes containing that Ingredient (via RecipeItem) SHALL have `cached_at` set to null
- **THEN** a background recalculation SHALL update the cache fields

### Requirement: Recipe Material Section
Recipe SHALL support Material assignment via ContentMaterialItem for kitchen equipment. Materials SHALL be displayed in a separate "Kuechengeraete" section.

#### Scenario: Recipe with kitchen equipment
- **WHEN** a Recipe has Materials assigned
- **THEN** a "Kuechengeraete" section SHALL appear below or alongside the "Zutaten" section
- **THEN** each material SHALL link to the Material detail page

### Requirement: RecipeItem uses Supply-based Ingredient
RecipeItem SHALL reference `supply.Ingredient` and `supply.Portion`. The cross-app FK pattern SHALL remain the same.

#### Scenario: RecipeItem references supply.Ingredient
- **WHEN** a RecipeItem is created
- **THEN** it SHALL reference a Portion from the supply app
- **THEN** quantities SHALL be per NormPerson

### Requirement: Recipe list shows cached nutritional data
The recipe list API and UI SHALL use cached nutritional fields for displaying Nutri-Score badges and price indicators without additional joins.

#### Scenario: Recipe list with Nutri-Score badge
- **WHEN** a user views the recipe list
- **THEN** each recipe card SHALL display a Nutri-Score badge based on `cached_nutri_class`
- **THEN** the badge SHALL show A (green) through E (red)

#### Scenario: Recipe list with price indicator
- **WHEN** a user views the recipe list
- **THEN** each recipe card SHALL display a price indicator based on `cached_price_total`
- **THEN** the price SHALL be formatted as EUR with traffic-light coloring (green < 3 EUR, yellow < 8 EUR, red >= 8 EUR)

#### Scenario: Stale cache display
- **WHEN** a Recipe has `cached_at = null` (cache invalidated)
- **THEN** the list SHALL either show "wird berechnet..." or fetch fresh values on demand

## REMOVED Requirements

### Requirement: RecipeComment Model
**Reason**: Replaced by generic ContentComment from content app
**Migration**: All RecipeComment data SHALL be migrated to ContentComment with content_type pointing to Recipe

### Requirement: RecipeEmotion Model
**Reason**: Replaced by generic ContentEmotion from content app
**Migration**: All RecipeEmotion data SHALL be migrated to ContentEmotion with content_type pointing to Recipe

### Requirement: RecipeView Model
**Reason**: Replaced by generic ContentView from content app
**Migration**: All RecipeView data SHALL be migrated to ContentView with content_type pointing to Recipe

### Requirement: Recipe standalone status field
**Reason**: Status management is now handled by Content base class with approval workflow
**Migration**: Existing Recipe status values SHALL be mapped to new ContentStatus choices
