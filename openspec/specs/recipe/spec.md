## MODIFIED Requirements

### Requirement: Recipe Model inherits from Content
Recipe SHALL inherit from the abstract `Content` base class. All existing Recipe-specific fields (recipe_type, servings) SHALL be preserved. The `servings` field SHALL default to 1 (Normportion) and represent the base portion count for which all RecipeItem quantities are stored. Recipe SHALL additionally have denormalized cache fields for aggregated nutritional values per Normportion: `cached_energy_kj` (FloatField, nullable), `cached_protein_g` (FloatField, nullable), `cached_fat_g` (FloatField, nullable), `cached_carbohydrate_g` (FloatField, nullable), `cached_sugar_g` (FloatField, nullable), `cached_fibre_g` (FloatField, nullable), `cached_salt_g` (FloatField, nullable), `cached_nutri_class` (IntegerField 1-5, nullable), `cached_price_total` (DecimalField, nullable), `cached_at` (DateTimeField, nullable).

#### Scenario: Recipe has all Content fields and cache fields
- **WHEN** a Recipe is created
- **THEN** it SHALL have all Content base fields (title, slug, summary, description, tags, scout_levels, authors, embedding, etc.)
- **THEN** it SHALL have recipe-specific fields (recipe_type, servings)
- **THEN** servings SHALL default to 1
- **THEN** it SHALL have all cached nutritional fields (initially null)

### Requirement: Recipe Material Section
Recipe SHALL support Material assignment via ContentMaterialItem for kitchen equipment (knives, cutting boards, ovens, etc.). Materials SHALL be displayed in a separate "Küchengeräte" section, distinct from the "Zutaten" section.

#### Scenario: Recipe with kitchen equipment
- **WHEN** a Recipe has Materials assigned
- **THEN** a "Küchengeräte" section SHALL appear below or alongside the "Zutaten" section
- **THEN** each material SHALL link to the Material detail page

### Requirement: RecipeItem uses Supply-based Ingredient
RecipeItem SHALL reference `supply.Ingredient` and `supply.Portion`. The cross-app FK pattern SHALL remain the same.

#### Scenario: RecipeItem references supply.Ingredient
- **WHEN** a RecipeItem is created
- **THEN** it SHALL reference a Portion from the supply app
- **THEN** quantities SHALL be per NormPerson (1 Portion)

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

## ADDED Requirements

### Requirement: Cached nutritional fields on Recipe
Recipe SHALL maintain cached nutritional aggregates computed from its RecipeItems. These are the denormalized cache fields defined on the Recipe model (cached_energy_kj, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_sugar_g, cached_fibre_g, cached_salt_g, cached_nutri_class, cached_price_total, cached_at).

#### Scenario: Cache fields populated on RecipeItem change
- **WHEN** a RecipeItem is added, modified, or deleted from a Recipe
- **THEN** the Recipe's cached nutritional fields SHALL be recalculated
- **THEN** `cached_at` SHALL be set to the current timestamp
- **THEN** the calculation SHALL aggregate all RecipeItem nutritional values per Normportion (based on servings)

#### Scenario: Cache fields invalidated on Ingredient change
- **WHEN** an Ingredient's nutritional values or price_per_kg are updated
- **THEN** all Recipes containing that Ingredient (via RecipeItem) SHALL have `cached_at` set to null
- **THEN** a background recalculation SHALL update the cache fields

### Requirement: Signal-based cache invalidation
The system SHALL automatically invalidate and recalculate Recipe caches when underlying data changes, using Django signals.

#### Scenario: RecipeItem saved or deleted
- **WHEN** a RecipeItem is saved (`post_save`) or deleted (`post_delete`)
- **THEN** the parent Recipe's cached nutritional fields SHALL be recalculated

#### Scenario: Ingredient updated
- **WHEN** an Ingredient is saved (`post_save`) with changed nutritional values
- **THEN** all Recipes containing that Ingredient (via RecipeItem) SHALL have their caches recalculated

### Requirement: recalculate_recipe_cache management command
The system SHALL provide a Django management command `recalculate_recipe_cache` to bulk-recalculate cached nutritional fields for all (or specific) Recipes.

#### Scenario: Full recalculation
- **WHEN** an admin runs `uv run python manage.py recalculate_recipe_cache`
- **THEN** all Recipes SHALL have their cached nutritional fields recalculated
- **THEN** a summary of updated recipes SHALL be printed

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

### Requirement: HealthRule model for traffic-light thresholds
The system SHALL provide a `HealthRule` model that defines configurable thresholds for nutritional traffic-light indicators (green/yellow/red) per nutrient.

#### Scenario: Traffic-light evaluation
- **WHEN** a Recipe's cached nutritional values are evaluated against HealthRules
- **THEN** each nutrient SHALL receive a traffic-light classification (green, yellow, red) based on the configured thresholds
- **THEN** the UI SHALL display the traffic-light indicators alongside nutritional values

### Requirement: Portionsrechner-Daten in Recipe-API
Die Recipe-Detail-API SHALL zusätzliche Daten für den Portionsrechner liefern, einschließlich aller verfügbaren Portionen pro Zutat.

#### Scenario: Recipe-Detail enthält Portions-Informationen
- **WHEN** ein Nutzer `GET /api/recipes/{id}/` oder `GET /api/recipes/by-slug/{slug}/` aufruft
- **THEN** SHALL jedes RecipeItem im Response zusätzlich `ingredient_portions` enthalten: eine Liste aller Portionen der Zutat mit `name`, `weight_g`, `priority`, `is_default`
- **THEN** SHALL jedes RecipeItem `ingredient_density` und `ingredient_viscosity` enthalten

### Requirement: Export-Button auf Rezeptdetailseite
Die Rezeptdetailseite SHALL einen "Zur Einkaufsliste hinzufügen"-Button anzeigen.

#### Scenario: Einkaufsliste aus Rezept erstellen
- **WHEN** ein authentifizierter Nutzer auf der Rezeptdetailseite "Zur Einkaufsliste" klickt
- **THEN** SHALL ein Dialog erscheinen mit der aktuellen Portionszahl aus dem Skalierungsrechner
- **THEN** SHALL der Nutzer die Portionszahl anpassen können
- **THEN** SHALL nach Bestätigung die Shopping-List-API aufgerufen werden
- **THEN** SHALL der Nutzer zur erstellten Einkaufsliste weitergeleitet werden
