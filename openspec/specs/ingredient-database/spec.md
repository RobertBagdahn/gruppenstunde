## MODIFIED Requirements

### Requirement: Ingredient is standalone model
Ingredient SHALL be a standalone Django model (`models.Model`), NOT inheriting from the abstract `Supply` base class. This is because Ingredient has 30+ nutritional/score fields that have nothing in common with Supply (which provides name, slug, description, image). The model SHALL live in the `supply` app. `price_per_kg` (DecimalField) SHALL be the sole price field — no separate Price model.

#### Scenario: Ingredient has price_per_kg as only price field
- **WHEN** an Ingredient is created or updated
- **THEN** `price_per_kg` SHALL be settable directly on the Ingredient
- **THEN** there SHALL be no separate Price model or Price table

#### Scenario: Ingredient does not inherit Supply fields
- **WHEN** Ingredient model is inspected
- **THEN** it SHALL NOT have inherited fields from Supply (no automatic slug, image, soft_delete from Supply)
- **THEN** it SHALL define its own name, slug, description fields directly

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

In addition to the existing 11 macronutrient fields, the model SHALL include exactly one micronutrient: `vitamin_c_mg` (nullable FloatField, default NULL). All other vitamin and mineral fields SHALL be removed.

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

#### Scenario: AI ingredient import
- **WHEN** the AI service creates/enriches an ingredient
- **THEN** only macros and `vitamin_c_mg` are requested and stored

#### Scenario: Ingredient schema validation
- **WHEN** an ingredient is submitted via API
- **THEN** only macros and `vitamin_c_mg` are accepted as nutritional fields

### Requirement: DGE reference values
The DGE reference model and static data SHALL only include `vitamin_c_mg` as micronutrient reference. All other vitamin/mineral reference fields SHALL be removed.

#### Scenario: Norm portion calculation
- **WHEN** norm portion nutritional targets are calculated
- **THEN** only `vitamin_c_mg` is included as micronutrient target

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

### Requirement: Ingredient tracks creator
The Ingredient model SHALL have a `created_by` field (nullable ForeignKey to User) that records which user created the ingredient.

#### Scenario: New ingredient is created via API
- **WHEN** an authenticated user creates an ingredient via `POST /api/ingredients/`
- **THEN** the `created_by` field MUST be set to the authenticated user

#### Scenario: Existing ingredients without creator
- **WHEN** an ingredient has `created_by = NULL`
- **THEN** only staff users SHALL be able to edit or delete it

### Requirement: Role-based edit permission
The system SHALL restrict ingredient update and delete to users who are either the creator or have `is_staff=True`.

#### Scenario: Creator edits their ingredient
- **WHEN** the creator of an ingredient sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Staff edits any ingredient
- **WHEN** a staff user sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Non-creator non-staff attempts edit
- **WHEN** a user who is neither creator nor staff sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

#### Scenario: Non-creator non-staff attempts delete
- **WHEN** a user who is neither creator nor staff sends `DELETE /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

### Requirement: Frontend edit visibility
The frontend SHALL only show edit/delete controls when the current user is the ingredient creator or has staff status.

#### Scenario: Creator views their ingredient detail
- **WHEN** the ingredient creator views `/ingredients/:slug`
- **THEN** edit and delete buttons MUST be visible

#### Scenario: Regular user views another user's ingredient
- **WHEN** a non-staff user who is not the creator views `/ingredients/:slug`
- **THEN** edit and delete buttons MUST NOT be visible

### Requirement: API exposes created_by_id
The ingredient API response schema SHALL include `created_by_id: int | null`.

#### Scenario: Ingredient detail response
- **WHEN** a client fetches `GET /api/ingredients/{slug}/`
- **THEN** the response MUST include `created_by_id` (integer or null)

### Requirement: REWE Artikelnummer über API exponieren
Das Feld `nan_art_id_rewe` wird in den API-Response- und Request-Schemas für Ingredients aufgenommen.

#### Scenario: Ingredient abrufen mit REWE Artikelnummer
- **WHEN** ein Ingredient mit gesetzter `nan_art_id_rewe` über GET `/api/supply/ingredients/{id}` abgerufen wird
- **THEN** enthält die Response das Feld `nan_art_id_rewe` mit dem gespeicherten Wert

#### Scenario: Ingredient ohne REWE Artikelnummer
- **WHEN** ein Ingredient ohne `nan_art_id_rewe` abgerufen wird
- **THEN** ist `nan_art_id_rewe` im Response `null`

#### Scenario: Ingredient erstellen/bearbeiten mit REWE Artikelnummer
- **WHEN** ein Ingredient via POST/PATCH mit `nan_art_id_rewe` erstellt/bearbeitet wird
- **THEN** wird der Wert gespeichert

### Requirement: REWE Artikelnummer im UI anzeigen

#### Scenario: Detail-Seite mit REWE Artikelnummer
- **WHEN** ein Ingredient mit `nan_art_id_rewe` auf der Detail-Seite angezeigt wird
- **THEN** erscheint im Referenzen-Block eine Zeile "REWE Artikelnr." mit dem Wert

#### Scenario: Detail-Seite ohne REWE Artikelnummer
- **WHEN** `nan_art_id_rewe` null ist
- **THEN** wird die Zeile nicht angezeigt

### Requirement: REWE Artikelnummer im Formular editierbar

#### Scenario: Create/Edit-Formular
- **WHEN** das Ingredient-Formular angezeigt wird
- **THEN** gibt es ein Eingabefeld für "REWE Artikelnr." im Referenzen-Abschnitt
