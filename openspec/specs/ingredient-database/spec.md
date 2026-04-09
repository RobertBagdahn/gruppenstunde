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
Portion SHALL reference Ingredient directly. The Price model SHALL be removed entirely. Ingredient SHALL store its price via the `price_per_kg` field. Additionally, Portion SHALL have a `priority` field (IntegerField, default=0) to control display ordering and an `is_default` field (BooleanField, default=False) to mark the preferred portion for display. Only one Portion per Ingredient SHALL have `is_default=True`.

#### Scenario: Portion for supply.Ingredient
- **WHEN** a Portion is created for an Ingredient
- **THEN** it SHALL reference supply.Ingredient
- **THEN** all weight conversion and measuring unit logic SHALL remain unchanged

#### Scenario: Portion with priority and default
- **WHEN** Portionen für eine Zutat existieren
- **THEN** SHALL die Portion mit `is_default=True` als bevorzugte Anzeige-Portion verwendet werden
- **THEN** SHALL maximal eine Portion pro Zutat `is_default=True` haben
- **THEN** SHALL bei Setzen von `is_default=True` auf einer Portion alle anderen Portionen derselben Zutat auf `is_default=False` gesetzt werden

#### Scenario: Portions sortiert nach Priorität
- **WHEN** Portionen einer Zutat abgefragt werden
- **THEN** SHALL die Sortierung nach `priority` (absteigend), dann `rank` (aufsteigend) erfolgen

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

## ADDED Requirements

### Requirement: Supply-aware AI autocomplete
The AI autocomplete for ingredient data SHALL also suggest Material entries when relevant (e.g., suggesting "Schneidebrett" when creating a recipe that involves chopping).

#### Scenario: AI suggests kitchen equipment
- **WHEN** a user creates a Recipe and the AI analyzes the description
- **THEN** the AI MAY suggest relevant Materials (kitchen equipment) in addition to Ingredients
- **THEN** suggested Materials SHALL appear in the "Küchengeräte" section

### Requirement: Portion-Priorität API
Die Portion-API SHALL das Setzen und Ändern von `priority` und `is_default` unterstützen.

#### Scenario: Portion-Priorität setzen
- **WHEN** ein Nutzer `PATCH /api/ingredients/{slug}/portions/{id}/` mit `priority` und/oder `is_default` sendet
- **THEN** SHALL die Priorität aktualisiert werden
- **THEN** SHALL bei `is_default=true` alle anderen Portionen derselben Zutat auf `is_default=false` gesetzt werden

#### Scenario: Portion erstellen mit Priorität
- **WHEN** ein Nutzer `POST /api/ingredients/{slug}/portions/` mit `priority` und `is_default` sendet
- **THEN** SHALL die Portion mit der angegebenen Priorität erstellt werden
- **THEN** SHALL `priority` den Default-Wert 0 und `is_default` den Default-Wert False haben, wenn nicht angegeben
