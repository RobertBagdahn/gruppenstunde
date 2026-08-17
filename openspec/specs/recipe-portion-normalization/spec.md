### Requirement: All recipes MUST have servings=1

The system SHALL store all recipe quantities as per-1-portion values. The `Recipe.portions` field MUST always be `1`. All `RecipeItem.quantity` values represent the amount needed for exactly one portion. The Create-Recipe UI SHALL NOT show an editable portions field — `portions: 1` is always sent to the API.

#### Scenario: Create recipe always sends portions=1
- **WHEN** a user creates a recipe via the UI
- **THEN** the API request SHALL contain `portions: 1`
- **THEN** the UI SHALL NOT display an editable Portionen input field in Step 0

#### Scenario: Recipe import sends servings as portions
- **WHEN** a recipe is imported from URL with `recipe_draft.servings` field
- **THEN** the CreatePage SHALL read `servings` (not `portions`) from the response
- **THEN** quantities SHALL be normalized to 1 portion if `servings > 1`

#### Scenario: Backend API enforces servings=1
- **WHEN** a client sends a recipe create request with `portions=4`
- **THEN** the saved recipe SHALL have `portions=1`

#### Scenario: Backend API enforces servings=1 on update
- **WHEN** a client sends a recipe update request with `portions=2`
- **THEN** the saved recipe SHALL have `portions=1`

#### Scenario: Management command normalizes existing recipes
- **WHEN** the management command `normalize_recipe_servings` is executed
- **THEN** all recipes with `portions > 1` SHALL be updated: quantities divided by `portions` where needed, and `portions` set to `1`

#### Scenario: Dry-run mode shows changes without applying
- **WHEN** the management command is executed with `--dry-run`
- **THEN** it SHALL display all planned changes without modifying the database

#### Scenario: Cache recalculation after normalization
- **WHEN** recipe item quantities are modified
- **THEN** the recipe cache (nutrition, price) SHALL be recalculated

### Requirement: DGE-Referenz dynamisch (MODIFIED)
Der Backend-API-Endpunkt für die Nährstoff-Analyse SHALL um optionale `age` (Integer, Jahre) und `gender` (String, "male"/"female") Query-Parameter erweitert werden. Der Backend-Endpunkt SHALL basierend auf age/gender andere DGE-Referenzwerte verwenden. Das Frontend SHALL im Analyse-Tab "Inhaltsstoffe" einen Dropdown anbieten, der age/gender setzt und die Daten neu lädt. Der Standardwert SHALL `25`/`male` bleiben.

#### Scenario: DGE-Parameter in API
- **WHEN** `GET /api/recipes/{id}/nutrition-breakdown/?age=15&gender=female` aufgerufen wird
- **THEN** verwendet der Backend DGE-Referenzwerte für 15-jährige weibliche Jugendliche
- **THEN** die `dge_coverage`-Prozentsätze sind entsprechend neu berechnet

#### Scenario: Default-Wert ohne Parameter
- **WHEN** `GET /api/recipes/{id}/nutrition-breakdown/` ohne age/gender aufgerufen wird
- **THEN** verwendet der Backend die Standard-DGE-Referenz (25/male)

#### Scenario: DGE-Filter im Frontend
- **WHEN** ein Nutzer den Inhaltsstoffe-Tab öffnet
- **THEN** sieht er einen Dropdown mit Optionen: "25 J., männlich" (Standard), "15 J., männlich", "15 J., weiblich", "10 J., divers"
- **THEN** bei Änderung werden die Daten mit neuen age/gender-Parametern neu geladen
- **THEN** ein Ladeindikator zeigt den Neulade-Vorgang an
