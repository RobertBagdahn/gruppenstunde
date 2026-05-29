## ADDED Requirements

### Requirement: Seed-Data Management Command

Das System MUSS ein Management Command bereitstellen das realistische Beispieldaten erstellt.

#### Scenario: Command ausführen
- **WHEN** `uv run python manage.py seed_data` ausgeführt wird
- **THEN** MÜSSEN mindestens 50 Basis-Zutaten mit vollständigen Nährwertdaten, Nutri-Score, Portionen und Preisen erstellt werden
- **THEN** MÜSSEN mindestens 10 realistische Pfadfinder-Rezepte erstellt werden (verschiedene `recipe_type`s: Frühstück, Warmgericht, Kaltgericht, Snack, Dessert, Getränk)
- **THEN** MUSS jedes Rezept vollständige RecipeItems mit korrekten Mengenangaben haben
- **THEN** MÜSSEN alle Rezepte auf `servings=1` (1 Normportion) normalisiert sein

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (`get_or_create` Pattern)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben

#### Scenario: Zutaten mit vollständigen Daten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS sie folgende Felder befüllt haben: `name`, `slug`, `energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- **THEN** MUSS mindestens eine `Portion` mit `weight_g` und `measuring_unit` zugeordnet sein

#### Scenario: Rezepte mit realistischem Pfadfinder-Kontext
- **WHEN** ein Rezept über das Seed-Command erstellt wird
- **THEN** MUSS es einen deutschen Titel, eine deutsche Zusammenfassung, deutsche Beschreibung, passende Tags und Scout Levels haben
- **THEN** MÜSSEN alle Texte korrekte Umlaute verwenden (ä, ö, ü, ß — niemals ae, oe, ue, ss)
- **THEN** MUSS `status=approved` gesetzt sein

### Requirement: Beispielrezepte Vielfalt

Die Seed-Rezepte MÜSSEN verschiedene Rezepttypen und Schwierigkeitsgrade abdecken.

#### Scenario: Rezepttyp-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN mindestens 2 Frühstücksrezepte, 3 Warmgerichte, 2 Kaltgerichte, 1 Dessert, 1 Snack und 1 Getränk vorhanden sein

#### Scenario: Schwierigkeits-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN Rezepte verschiedener Schwierigkeitsgrade vorhanden sein (leicht, mittel, schwer)

### Requirement: Seed data includes comprehensive nutrition rules

The `seed_all.py` command SHALL seed comprehensive nutrition rules. The seed data SHALL include:

**RecipeHints (50+ rules):**
- All macronutrient rules from the old Inspi project (20+ rules for energy, protein, fat, fat_sat, sugar, salt, sodium, fibre, weight, nutri_class)
- New vitamin rules (6 rules for vitamin_c, vitamin_a, vitamin_d, vitamin_b12, folate)
- New mineral rules (7 rules for calcium, iron, magnesium, zinc, potassium)
- Type-specific rules for breakfast (3), snack (3), and drink (2)
- Every rule SHALL have a non-empty `improvement_text` in German

**HealthRules (20+ rules):**
- Existing 6 rules (sugar/day, energy/day, costs/day, nutri-score/event, sugar/meal, energy/meal)
- New day-scope rules: vitamin_c, calcium, iron, fibre, protein, fat, salt, vitamin_a, folate, magnesium, potassium, zinc (12 rules)
- New meal-scope rules: vitamin_c, fibre, salt (3 rules)
- Every rule SHALL have a non-empty `tip_text` in German

**DgeReference entries (20 entries):**
- 10 age groups x 2 genders
- All macronutrient reference values (from existing dge_reference.py)
- All vitamin reference values (from official DGE D-A-CH tables)
- All mineral reference values (from official DGE D-A-CH tables)

#### Scenario: Seed creates all RecipeHints
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** at least 50 RecipeHint objects SHALL be created with populated name, parameter, hint_level, recipe_objective, and improvement_text fields

#### Scenario: Seed creates all HealthRules
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** at least 20 HealthRule objects SHALL be created with populated tip_text fields

#### Scenario: Seed creates DGE references
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** 20 DgeReference objects SHALL be created (10 age groups x 2 genders)
- **AND** each entry SHALL have vitamin and mineral reference values populated

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate RecipeHint, HealthRule, or DgeReference objects SHALL be created

---

## Packing List Seed Data

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

# CI Seed Data

## ADDED Requirements

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
