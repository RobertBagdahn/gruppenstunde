# seed-data Specification

## Purpose
Defines seed data requirements for development, demos, and food rule defaults.
## Requirements
### Requirement: Seed-Data Management Command

Das System MUSS ein Management Command bereitstellen das realistische Beispieldaten erstellt.

#### Scenario: Command ausführen
- **WHEN** `uv run python manage.py seed_all` ausgeführt wird
- **THEN** MÜSSEN mindestens 50 Basis-Zutaten mit vollständigen Nährwertdaten, Nutri-Score, Portionen und Preisen erstellt werden
- **THEN** MÜSSEN mindestens 10 realistische Pfadfinder-Rezepte erstellt werden (verschiedene `recipe_type`s: Frühstück, Warmgericht, Kaltgericht, Snack, Dessert, Getränk)
- **THEN** MUSS jedes Rezept vollständige RecipeItems mit korrekten Mengenangaben haben
- **THEN** MÜSSEN alle Rezepte auf `servings=1` (1 Normportion) normalisiert sein
- **THEN** MÜSSEN Breakfast-Tags (`breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`) existieren
- **THEN** MÜSSEN 6 Base-Zutaten mit Tag `breakfast-base` existieren
- **THEN** MÜSSEN 17 Topping-Zutaten mit Tag `breakfast-topping` existieren
- **THEN** MÜSSEN 3 Drink-Rezepte mit Tag `breakfast-drink` existieren
- **THEN** MÜSSEN 6 Drink-Zutaten (Milch, Sahne, Hafermilch, Orangensaft, Apfelsaft, Kondensmilch) als `supply.Ingredient` existieren
- **THEN** MÜSSEN 5 warme Frühstücksrezepte (Rührei, Pfannkuchen, Omelett, Porridge, Gekochte Eier) mit Tag `breakfast-warm-meal` existieren

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (`get_or_create` Pattern)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben

#### Scenario: Zutaten mit vollständigen Daten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS sie folgende Felder befüllt haben: `name`, `slug`, `energy_kcal`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- **THEN** MUSS mindestens eine `Portion` mit `weight_g` und `measuring_unit` zugeordnet sein

#### Scenario: Rezepte mit realistischem Pfadfinder-Kontext
- **WHEN** ein Rezept über das Seed-Command erstellt wird
- **THEN** MUSS es einen deutschen Titel, eine deutsche Zusammenfassung, deutsche Beschreibung, passende Tags und Scout Levels haben
- **THEN** MÜSSEN alle Texte korrekte Umlaute verwenden (ä, ö, ü, ß — niemals ae, oe, ue, ss)
- **THEN** MUSS `status=approved` gesetzt sein

#### Scenario: Seed auf Produktion ausgeführt
- **WHEN** `uv run python manage.py seed_breakfast_catalog` auf der Produktionsdatenbank ausgeführt wird
- **THEN** MÜSSEN die 6 Basis-Zutaten (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen halb/ganz) als `supply.Ingredient` mit Tag `breakfast-base` existieren
- **THEN** MÜSSEN 17 Topping-Zutaten mit Tag `breakfast-topping` existieren
- **THEN** MÜSSEN 3 Drink-Rezepte mit Tag `breakfast-drink` existieren

#### Scenario: Vorhandene Brot-Zutaten nachgetaggt
- **WHEN** `uv run python manage.py seed_breakfast_catalog --tag-existing` ausgeführt wird
- **THEN** MÜSSEN existierende generische Brot-Zutaten (z.B. Brot, Brötchen, Vollkornbrot, Toast) den Tag `breakfast-base` erhalten
- **THEN** DÜRFEN keine neuen Zutaten dupliziert werden (nur Tags werden hinzugefügt)

### Requirement: Beispielrezepte Vielfalt

Die Seed-Rezepte MÜSSEN verschiedene Rezepttypen und Schwierigkeitsgrade abdecken.

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

**DgeReference entries:**
- 10 age groups x 2 genders
- All macronutrient reference values from the existing DGE reference data
- All supported vitamin and mineral reference values

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

#### Scenario: Seed creates DGE references
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** 20 DgeReference objects SHALL be created (10 age groups x 2 genders)
- **AND** each entry SHALL have supported vitamin and mineral reference values populated

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate Rule or DgeReference objects SHALL be created

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

Bisher: `measuring_unit=None`, `quantity_type="once"` mit Gesamtmenge.
Neu: Korrekte Unit-Zuordnung und `quantity_type="per_person"` mit Pro-Portion-Menge.

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
