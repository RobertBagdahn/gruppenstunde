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

In addition to the existing 11 macronutrient fields, the model SHALL include:

**Vitamins (13 fields, all nullable FloatField):**
- `vitamin_a_mg`, `vitamin_b1_mg`, `vitamin_b2_mg`, `vitamin_b6_mg`, `vitamin_b12_ug`
- `vitamin_c_mg`, `vitamin_d_ug`, `vitamin_e_mg`, `vitamin_k_ug`
- `niacin_mg`, `folate_ug`, `pantothenic_acid_mg`, `biotin_ug`

**Minerals (12 fields, all nullable FloatField):**
- `calcium_mg`, `iron_mg`, `magnesium_mg`, `zinc_mg`, `potassium_mg`, `phosphorus_mg`
- `iodine_ug`, `selenium_ug`, `copper_mg`, `manganese_mg`, `chromium_ug`, `fluoride_mg`

All new fields SHALL default to NULL and be grouped in separate Admin fieldsets:
- "Vitamine" fieldset with all 13 vitamin fields
- "Mineralstoffe" fieldset with all 12 mineral fields

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

#### Scenario: Create ingredient with vitamin data
- **WHEN** a POST request to `/api/ingredients/` includes vitamin_c_mg=53.0 and iron_mg=0.7
- **THEN** the ingredient SHALL be created with those values stored

#### Scenario: Update ingredient mineral data
- **WHEN** a PATCH request to `/api/ingredients/{slug}/` includes calcium_mg=120
- **THEN** the ingredient's calcium_mg SHALL be updated to 120 and a nutri-score recalculation SHALL be triggered

#### Scenario: Admin views ingredient with full nutrition
- **WHEN** an admin views an Ingredient in Django admin
- **THEN** the admin SHALL see four fieldsets: "Nährwerte pro 100g" (Big 7 + Ballaststoffe), "Vitamine", "Mineralstoffe", and "Sonstiges" (fructose, lactose, fruit_factor)

### Requirement: Ingredient API schemas include micronutrients
The `IngredientDetailOut` schema SHALL include all 25 new micronutrient fields (13 vitamins + 12 minerals) as optional float fields. The `IngredientCreateIn` and `IngredientUpdateIn` schemas SHALL also accept these fields as optional inputs.

The `IngredientListOut` schema SHALL NOT include micronutrient fields (to keep list responses lightweight).

#### Scenario: Ingredient detail returns vitamins
- **WHEN** a GET request is made to `/api/ingredients/{slug}/` for an ingredient with vitamin_c_mg=53.0
- **THEN** the response SHALL include `vitamin_c_mg: 53.0` and all other null vitamin fields as `null`

#### Scenario: Ingredient list does not return vitamins
- **WHEN** a GET request is made to `/api/ingredients/`
- **THEN** the response items SHALL NOT contain vitamin or mineral fields

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

### Requirement: Zutatenpreise pflegen

Alle Basis-Zutaten MÜSSEN einen realistischen `price_per_kg` Wert haben.

#### Scenario: Preis bei Seed-Zutaten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS `price_per_kg` mit einem realistischen deutschen Supermarkt-Durchschnittspreis befüllt sein (Stand 2024/2025)

#### Scenario: Preis-Anzeige im Frontend
- **WHEN** ein Rezept Zutaten mit `price_per_kg` hat
- **THEN** MUSS der `cached_price_total` über den bestehenden `recalculate_recipe_cache` automatisch berechnet werden
- **THEN** MUSS die Preisanzeige auf der Rezept-Detailseite den berechneten Gesamtpreis anzeigen
