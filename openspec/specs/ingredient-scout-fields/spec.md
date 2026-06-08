## ADDED Requirements

### Requirement: Ingredient has storage_type field
The Ingredient model SHALL have a `storage_type` field (CharField with StorageTypeChoices) indicating how the ingredient must be stored.

Choices:
- `dry` — Trocken (haltbar bei Raumtemperatur, z.B. Nudeln, Mehl)
- `refrigerated` — Kühlschrank (muss gekühlt werden, z.B. Milch, Fleisch)
- `frozen` — Gefroren (Tiefkühlprodukte)
- `ambient` — Raumtemperatur (ungekühlt haltbar, z.B. Konserven, Öl)

#### Scenario: Ingredient created with storage_type
- **WHEN** an ingredient is created with `storage_type="refrigerated"`
- **THEN** the value SHALL be persisted and returned in API responses

#### Scenario: Ingredient without storage_type
- **WHEN** an ingredient has `storage_type=NULL`
- **THEN** the field SHALL be null in API responses

#### Scenario: Filter by storage type in ingredient list
- **WHEN** a user sets `storage_type=refrigerated` filter on the ingredient list endpoint
- **THEN** only ingredients with `storage_type="refrigerated"` SHALL be returned

### Requirement: Ingredient has cooking_factor field
The Ingredient model SHALL have a `cooking_factor` field (FloatField, default=1.0) representing the multiplier from raw to cooked weight.

Display format: "aus 100g roh → {factor × 100}g gekocht"

#### Scenario: Ingredient with cooking factor
- **WHEN** an ingredient has `cooking_factor=2.5` (e.g. Nudeln)
- **THEN** the UI SHALL display "aus 100g roh → 250g gekocht"
- **THEN** recipes using this ingredient MAY calculate cooked yield from raw weight

#### Scenario: Ingredient without cooking factor
- **WHEN** an ingredient has `cooking_factor=NULL`
- **THEN** the UI SHALL display "–" or hide the field
- **THEN** no cooked yield calculation SHALL be performed

### Requirement: Ingredient has camp_suitable field
The Ingredient model SHALL have a `camp_suitable` field (BooleanField, default=False) indicating whether the ingredient is well-suited for scout camps (shelf-stable, lightweight, easy to prepare).

#### Scenario: Camp-suitable ingredient
- **WHEN** an ingredient has `camp_suitable=true`
- **THEN** the UI SHALL display a camp/badge icon next to the ingredient name

#### Scenario: Non-camp-suitable ingredient
- **WHEN** an ingredient has `camp_suitable=false` (default)
- **THEN** no camp indicator SHALL be displayed

### Requirement: Ingredient has preparation_time_min field
The Ingredient model SHALL have a `preparation_time_min` field (IntegerField, nullable) indicating typical preparation time in minutes (cooking, baking, soaking).

#### Scenario: Ingredient with prep time
- **WHEN** an ingredient has `preparation_time_min=12`
- **THEN** the UI SHALL display "Zubereitungsdauer: 12 Min."

#### Scenario: Ingredient without prep time
- **WHEN** an ingredient has `preparation_time_min=NULL` (e.g. raw fruit)
- **THEN** the UI SHALL display "–" or hide the field

### Requirement: Ingredient has season_start and season_end fields
The Ingredient model SHALL have `season_start` and `season_end` fields (IntegerField, nullable, 1–12) indicating the harvest/availability season in months. Both null means available year-round.

#### Scenario: Seasonal ingredient
- **WHEN** an ingredient has `season_start=4` and `season_end=6` (e.g. Spargel)
- **THEN** the UI SHALL display "Saison: April–Juni"

#### Scenario: Year-round ingredient
- **WHEN** an ingredient has `season_start=NULL` and `season_end=NULL`
- **THEN** the UI SHALL display "Saison: ganzjährig"

#### Scenario: Cross-year season
- **WHEN** an ingredient has `season_start=10` and `season_end=3`
- **THEN** the UI SHALL display "Saison: Oktober–März"
- **THEN** query logic SHALL treat start > end as wrapping around the year boundary

### Requirement: New scout fields in API schemas
The `IngredientDetailOut`, `IngredientCreateIn`, and `IngredientUpdateIn` schemas SHALL include all six new fields: `storage_type`, `cooking_factor`, `camp_suitable`, `preparation_time_min`, `season_start`, `season_end`.

#### Scenario: Full detail response includes scout fields
- **WHEN** an ingredient is fetched via `GET /api/ingredients/{slug}/`
- **THEN** the response SHALL include all six fields with their current values (or null)

#### Scenario: Create ingredient with scout fields
- **WHEN** an ingredient is created with scout field values via `POST /api/ingredients/`
- **THEN** all six fields SHALL be accepted and persisted

### Requirement: New scout fields in create/edit forms
The `IngredientCreatePage` and the edit section of `IngredientDetailPage` SHALL include form fields for all six new scout fields.

#### Scenario: Create form shows scout fields
- **WHEN** a user views the ingredient creation form
- **THEN** all six scout fields SHALL be visible as form inputs (dropdown for storage_type, number inputs for others, checkbox for camp_suitable)

#### Scenario: Detail page edit panel shows scout fields
- **WHEN** a staff user edits an ingredient on the detail page
- **THEN** all six scout fields SHALL be editable

### Requirement: New scout fields in AI suggest prompt and schema
The `suggest_all_fields` Gemini prompt SHALL request values for all six scout fields. The Pydantic `IngredientSuggestAllSchema` SHALL include these fields. The frontend `buildIngredientSuggestionFields` SHALL display AI-suggested scout values in the dialog.

#### Scenario: AI returns scout field suggestions
- **WHEN** `POST /api/ingredients/{slug}/ai-suggest-all/` is called
- **THEN** the response SHALL include suggested values for `storage_type`, `cooking_factor`, `camp_suitable`, `preparation_time_min`, `season_start`, `season_end`
- **THEN** the frontend dialog SHALL display these in the "Physikalische Eigenschaften & Lagerung" group
