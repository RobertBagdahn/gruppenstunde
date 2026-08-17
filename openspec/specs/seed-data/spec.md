# seed-data Specification

## Purpose
Defines seed data requirements for development, demos, and food rule defaults.
## Requirements
### Requirement: Seed-Data Management Command
The `seed_all` command SHALL create 50+ base ingredients with full nutritional data, Nutri-Score, portions, and prices for use in development and demos. Breakfast tags, NutritionalTags, and nutrition rules are also seeded. The command runs the breakfast catalog and breakfast recipes sub-commands.

After `enrich_seeds` has been run, the food fixtures in `backend/data/food/` contain the complete enriched dataset with 5,743 fully qualified ingredients, cleaned portions, comprehensive aliases, and recalculated recipe caches. The `seed_all` command remains for development use but the `seed_generic_terms` sub-command is no longer needed since generic aliases are now in the fixture data.

#### Scenario: Idempotent seed creation
- **WHEN** `seed_all` is executed twice
- **THEN** no duplicate ingredients, tags, or NutritionalTags are created
- **AND** `get_or_create()` is used for all entities
- **AND** admin customizations are not overwritten

### Requirement: Beispielrezepte Vielfalt

Die Seed-Rezepte SHALL (MÜSSEN) verschiedene Rezepttypen und Schwierigkeitsgrade abdecken.

#### Scenario: Rezepttyp-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN mindestens 2 Frühstücksrezepte, 3 Warmgerichte, 2 Kaltgerichte, 1 Dessert, 1 Snack und 1 Getränk vorhanden sein

#### Scenario: Schwierigkeits-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN Rezepte verschiedener Schwierigkeitsgrade vorhanden sein (leicht, mittel, schwer)

### Requirement: Seed data includes comprehensive nutrition rules

The seed commands SHALL seed comprehensive food rules for the unified `Rule` model. Seeded rules SHALL cover recipe, meal, day, and meal_event scopes and SHALL include practical thresholds for nutrition, price, weight, and Nutri-Score.

The default rule set SHALL include:

**Recipe rules:**
- Macronutrients and quality rules for energy, protein, fat, saturated fat, sugar, sodium or salt, fibre, weight, price, and `nutri_class`
- Recipe-scope rules SHALL be intended only for recipes with `recipe_type="warm_meal"` or `recipe_type="cold_meal"`
- Every rule SHALL have a non-empty German `tip_text` and, where useful, `improvement_text`

**Meal rules:**
- Rules for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, total food weight, and average `nutri_class`
- Meal-scope rules SHALL apply to all meal types in the planner

**Day rules:**
- Rules for daily energy, protein, fat, carbohydrate, fibre, sugar, saturated fat, sodium or salt, total price, total food weight, and average `nutri_class`

**Meal event rules:**
- Rules for average daily energy, protein, sugar, fibre, price, and average `nutri_class` across the whole MealPlan

**Note**: DgeReference database objects are NOT seeded. DGE reference values are exclusively managed as static data in `supply/data/dge_reference.py`.

#### Scenario: Seed creates recipe rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** recipe-scope Rule objects SHALL be created for energy, protein, fat, saturated fat, sugar, sodium or salt, fibre, weight, price, and `nutri_class`
- **THEN** each recipe-scope rule SHALL include a German `tip_text`

#### Scenario: Seed creates meal rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** meal-scope Rule objects SHALL be created for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, weight, and `nutri_class`

#### Scenario: Seed creates day and event rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** day-scope and meal_event-scope Rule objects SHALL be created for aggregate nutrition quality, price, weight where meaningful, and average Nutri-Score

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate Rule objects SHALL be created

#### Scenario: Existing user-edited rules
- **WHEN** a seeded rule already exists and has been edited by an admin
- **THEN** the seeding behavior SHALL avoid creating duplicates and SHOULD avoid overwriting intentional admin customizations unless a clear update strategy is implemented

### Requirement: Extended seed data with "do not bring" items
The seed command SHALL create packing lists using the Unified Catalog and the Builder algorithm. "Nicht mitbringen" items SHALL be included based on catalog tags.

#### Scenario: Seed command creates context-based packing lists
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** packing lists SHALL be generated using preset context configurations and the Builder algorithm
- **THEN** each generated list SHALL use the Unified Catalog as its data source
- **THEN** "Nicht mitbringen" items SHALL be included from the catalog's "Nicht mitbringen" category

### Requirement: Extended seed data with more categories and items
The seed command SHALL use the Unified Catalog which contains all categories and items from the previous Seed Catalog and Suggestion Catalog combined.

#### Scenario: Seed command uses Unified Catalog
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** items SHALL be sourced exclusively from the Unified Catalog in `suggestion_service.py`
- **THEN** the separate `CATEGORIES` dict in `seed_packing_lists.py` SHALL no longer exist

#### Scenario: Seed command creates preset-based templates
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** it SHALL create one PackingList per defined preset (e.g., Sommerlager, Winter-Hajk, etc.)
- **THEN** each list SHALL be generated by calling `build_dynamic_list()` with the preset's context
- **THEN** each list SHALL have `is_template=True`
- **THEN** each list SHALL store the preset's context in the new context fields

#### Scenario: Seed command idempotency
- **WHEN** the `seed_packing_lists` command is run with `--clear`
- **THEN** existing seeded packing lists SHALL be deleted before re-creation
- **THEN** the command SHALL complete without errors

---

**CI Seed Data**

### Requirement: CI seed data for groups
The system SHALL provide seed data (Django management command or fixture) that creates groups with fully configured corporate identities for development and testing purposes.

#### Scenario: Seed data creates groups with diverse CI
- **WHEN** the seed data command is executed
- **THEN** the system SHALL create at least 3 groups with distinct CI configurations:
  - "Stamm Windrose" — primary: `#2E7D32` (green), slogan: "Allzeit bereit!", full CI with all text fields
  - "Stamm Nordlicht" — primary: `#1565C0` (blue), slogan: "Immer vorwärts!", full CI with all text fields
  - "Stamm Feuerfuchs" — primary: `#E65100` (orange), slogan: "Gemeinsam stark!", full CI with all text fields

#### Scenario: Seed data includes realistic text blocks
- **WHEN** the seed data is created
- **THEN** each group's CI SHALL include realistic German text for all text fields:
  - `greeting_text`: formal greeting appropriate for scout group communication
  - `footer_text`: address, phone, email contact information
  - `payment_info`: bank account details (IBAN format with fictional data)
  - `signature_text`: group leader name and title

#### Scenario: Seed data is idempotent
- **WHEN** the seed data command is executed multiple times
- **THEN** the system SHALL update existing records rather than creating duplicates (using `update_or_create`)

#### Scenario: Seed data includes placeholder logos
- **WHEN** the seed data is created
- **THEN** each group SHALL have a programmatically generated placeholder logo (colored circle or initials) stored as a file, not requiring external downloads

### Requirement: Cooklang-Import erzeugt korrekte RecipeItems

Das System SHALL beim Cooklang-Import korrekte `measuring_unit`-Zuordnung und normalisierte Pro-Portion-Mengen verwenden; `RecipeItem` besitzt kein `quantity_type`-Feld.

#### Scenario: Re-Import bestehender Daten
- **WHEN** `--force` Flag beim Aufruf gesetzt ist
- **THEN** werden vorherige Cooklang-Imports gelöscht und korrekt neu importiert

### Requirement: Export-Skript exportiert tags-M2M für Ingredient

Das Export-Skript `bin/export_prod_data.py` SHALL das `tags`-M2M-Feld für `Ingredient` exportieren, damit lokale Importe die Tag-Zuordnungen nicht verlieren.

#### Scenario: Export enthält ingredient tags
- **WHEN** `uv run python bin/export_prod_data.py` ausgeführt wird
- **THEN** SHALL die `supply_ingredient.json`-Fixtures das `tags`-Feld für jeden Ingredient-Eintrag enthalten (analog zu `Recipe`)
- **THEN** SHALL die `supply_ingredient_tags`-Junction-Table korrekt in die Fixtures exportiert werden

#### Scenario: Import stellt Tags wieder her
- **WHEN** `uv run python manage.py import_prod_data --flush` ausgeführt wird (nach korrektem Export)
- **THEN** HABEN alle Ingredients die gleichen Tags wie in der Produktion

### Requirement: NutritionalTag fixtures are standardized

Die NutritionalTag-Fixtures in `backend/data/masterdata/supply_nutritionaltag.json` SHALL (MÜSSEN) die standardisierte name/name_opposite-Semantik aus `nutritional-tag-seed-standardization` verwenden.

#### Scenario: Fixture-Datei enthält neue Semantik
- **WHEN** die Fixture-Datei `supply_nutritionaltag.json` eingelesen wird
- **THEN** MUSS jedes `name`-Feld ein menschliches Merkmal beschreiben (z.B. "Vegan", "Eiallergie", "Glutenunverträglichkeit (Zöliakie)")
- **THEN** MUSS jedes `name_opposite`-Feld einen konkreten Inhaltsstoff beschreiben (z.B. "Tierische Produkte", "Ei und Eierzeugnisse", "Gluten")
- **THEN** DÜRFEN keine Einträge mit `name="Halal"` oder `name="Koscher"` existieren
- **THEN** MUSS es genau einen Eintrag mit `name="Nussallergie"` geben (keine separaten Einträge für "nussfrei" und "Schalenfrüchte")
- **THEN** MÜSSEN Einträge für "Milchallergie" und "Schalentierallergie" existieren

#### Scenario: Import via import_prod_data funktioniert
- **WHEN** `uv run python manage.py import_prod_data --only food` ausgeführt wird
- **THEN** MÜSSEN die NutritionalTags mit den neuen Namen importiert werden
- **THEN** DÜRFEN keine Fehler wegen ungültiger Daten auftreten

### Requirement: Generic Terms Seed Removal
The `seed_generic_terms` management command SHALL be removed or marked as deprecated. Generic aliases are now generated by `enrich_seeds` and stored directly in the fixture data.

#### Scenario: Generic aliases from fixture
- **WHEN** `import_prod_data --only food` is executed
- **THEN** generic aliases (is_generic=True) are loaded from supply_ingredientalias.json
- **AND** no separate seed command is needed to create them

### Requirement: Food Fixture Completeness
The food fixture files SHALL contain complete, enriched data for all ingredients, portions, aliases, recipes, and recipe items.

#### Scenario: All food fixtures exportable
- **WHEN** `enrich_seeds` completes successfully
- **THEN** supply_ingredient.json contains 5,743 enriched ingredients
- **AND** supply_portion.json contains cleaned portions for all ingredients
- **AND** supply_ingredientalias.json contains all generic and non-generic aliases
- **AND** recipe_recipe.json contains recipes with recalculated caches
- **AND** recipe_recipeitem.json contains items with valid portion references
- **AND** supply_ingredient_embeddings.json contains 5,743 regenerated embeddings
- **AND** `uv run python manage.py import_prod_data --flush --only food` executes without errors
