## ADDED Requirements

### Requirement: URL Import Option in Recipe Creation UI
The system SHALL display a third option card "Von URL importieren" on the recipe creation page (Step 1 "Beschreiben") alongside "Mit KI-Hilfe" and "Manuell".

#### Scenario: User selects URL import
- **WHEN** the user clicks the "Von URL importieren" card
- **THEN** the system SHALL display a URL input field with an "Importieren" button

### Requirement: Recipe Import from URL Endpoint

The system SHALL provide a `POST /api/recipes/import-from-url-enhanced/` endpoint that accepts a JSON body with a `url` field and returns a parsed recipe preview with matched/created ingredients. The response SHALL include `recipe_draft.servings` (number of servings of the original recipe).

#### Scenario: Successful import returns servings field
- **WHEN** a user submits a URL containing valid recipe data
- **THEN** the response SHALL include `recipe_draft.servings` with the detected serving count
- **THEN** the response SHALL include `recipe_items` with matched ingredients and quantity/unit data

#### Scenario: Successful import from schema.org JSON-LD
- **WHEN** a user submits a URL containing valid schema.org/Recipe JSON-LD markup
- **THEN** the system SHALL parse the structured data first and return a preview with title, description, servings, preparation_time, execution_time, recipe_type, steps, and ingredients

#### Scenario: Successful import via Gemini fallback
- **WHEN** a user submits a URL without schema.org markup or with incomplete structured data
- **THEN** the system SHALL send the page content to Gemini with Google Search Grounding and extract the same recipe fields

#### Scenario: Invalid or unreachable URL
- **WHEN** a user submits a malformed or unreachable URL
- **THEN** the system SHALL return HTTP 422 with a German error message indicating the URL is invalid or unreachable

#### Scenario: No recipe found on page
- **WHEN** a user submits a valid URL that contains no recognizable recipe data
- **THEN** the system SHALL return HTTP 422 with a German error message indicating no recipe was found

### Requirement: Ingredient Matching via Text Search and Gemini
The system SHALL match extracted ingredients against existing database entries using text search (icontains on name + aliases) as pre-filter, then Gemini for final matching decision.

#### Scenario: Existing ingredient matched
- **WHEN** Gemini determines an extracted ingredient matches an existing Ingredient (based on top-5 text search candidates including aliases)
- **THEN** the system SHALL use the existing Ingredient ID in the recipe item and NOT create a duplicate

#### Scenario: No match found — new ingredient created
- **WHEN** Gemini determines no existing ingredient matches
- **THEN** the system SHALL create a new Ingredient with all available fields populated via Gemini + Google Search Grounding

### Requirement: New Ingredient Data Completeness
When creating a new Ingredient via URL import, the system SHALL populate the following fields using Gemini + Google Search Grounding:
- Nutritional values per 100g: energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g
- Scores: child_score, scout_score, environmental_score, nova_score, nutri_score, nutri_class
- Physical properties: physical_density, physical_viscosity
- Aliases (IngredientAlias records)
- At least one Portion record (e.g. "Stück" with weight_g)

#### Scenario: All nutritional fields populated
- **WHEN** a new ingredient is created from URL import
- **THEN** all mandatory nutritional fields (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g) SHALL be non-null

#### Scenario: Scores calculated
- **WHEN** a new ingredient is created from URL import
- **THEN** child_score, scout_score, environmental_score, nova_score, and nutri_class SHALL be populated

### Requirement: Recipe Items with Quantity and Unit
The system SHALL create RecipeItem associations with correct `portion_id`, quantity, and optional note for each ingredient. The Import-Service SHALL resolve or create the appropriate Portion during import, not at save time. Portion-Erzeugung MUSS die zentrale `Portion`-Logik verwenden: Einheiten MÜSSEN auf kanonische `MeasuringUnit` gemappt werden (kein `get_or_create(name=...)`), Portionen MÜSSEN pro `(ingredient, name, measuring_unit, quantity)` dedupliziert werden, und `weight_g` MUSS über die zentrale Berechnung gesetzt werden, wenn Gemini keinen gültigen Wert liefert.

#### Scenario: Portion exists for ingredient + measuring_unit
- **WHEN** eine Portion für die Kombination (ingredient_id, measuring_unit_id) in der DB existiert
- **THEN** SHALL der Import-Service diese `portion_id` im Draft-Response zurückgeben

#### Scenario: Portion does not exist — created with estimated weight_g
- **WHEN** keine Portion für die Kombination (ingredient_id, measuring_unit_id) existiert
- **THEN** SHALL der Import-Service eine neue Portion erstellen mit `weight_g` aus Geminis `estimated_portion_weight_g`, sofern dieser `> 0` ist
- **THEN** wenn Gemini keinen gültigen `weight_g` liefert, MUSS der Wert über die zentrale Berechnung (`quantity × measuring_unit.quantity`) gesetzt werden
- **THEN** die neue `portion_id` SHALL im Draft-Response enthalten sein

#### Scenario: Einheit wird kanonisiert statt dupliziert
- **WHEN** Gemini einen Einheitennamen liefert (z. B. „g", „EL"), der einer kanonischen `MeasuringUnit` (per Name oder Alias) entspricht
- **THEN** MUSS die Portion die kanonische `MeasuringUnit` referenzieren
- **THEN** DARF KEINE neue Dubletten-Einheit per `MeasuringUnit.objects.get_or_create(name=...)` angelegt werden

#### Scenario: Neue Zutat erzeugt keine Duplikat-Portion
- **WHEN** beim Anlegen einer neuen Zutat eine Default-Portion erstellt wird, die mit `(ingredient, name, measuring_unit, quantity)` bereits existiert
- **THEN** MUSS die bestehende Portion wiederverwendet werden (`get_or_create`) statt eine neue zu erstellen

#### Scenario: Frontend sends portion_id when saving
- **WHEN** der User das Rezept speichert
- **THEN** SHALL das Frontend `portion_id` (nicht `ingredient_id`) an `POST /api/recipes/{id}/recipe-items/` senden

#### Scenario: Quantity and unit extracted
- **WHEN** the source recipe specifies "2 EL Olivenöl"
- **THEN** the system SHALL return a draft item with the correct portion_id (Olivenöl + EL), quantity=2

#### Scenario: Note extracted
- **WHEN** the source recipe specifies "2 Zwiebeln, fein gewürfelt"
- **THEN** the system SHALL set note="fein gewürfelt" on the draft item

### Requirement: Source URL Storage
The system SHALL store the original import URL on the Recipe model in a `source_url` field.

#### Scenario: Source URL persisted
- **WHEN** a recipe is created from a URL import
- **THEN** the Recipe.source_url field SHALL contain the original URL

### Requirement: Preview Before Save
The system SHALL NOT persist the recipe or ingredients until the user explicitly confirms. The import endpoint returns a draft preview that populates the edit form (Step 2).

#### Scenario: User reviews and edits before saving
- **WHEN** the import endpoint returns successfully
- **THEN** the system SHALL navigate to Step 2 (Bearbeiten) with all fields pre-filled and allow the user to modify before saving

### Requirement: Loading State During Import
The system SHALL display a loading indicator with the message "Rezept wird analysiert... Das kann einen Moment dauern." during the import process.

#### Scenario: Long-running import
- **WHEN** the import takes more than 1 second
- **THEN** the loading message SHALL remain visible until the response arrives or an error occurs

### Requirement: Single Gemini Call for All Ingredients
The system SHALL process all ingredient matching and creation in a single Gemini API call to minimize latency.

#### Scenario: Recipe with 12 ingredients
- **WHEN** a recipe with 12 ingredients is imported
- **THEN** the system SHALL make exactly one Gemini call that handles extraction, matching, and new-ingredient data generation for all 12 ingredients combined

### Requirement: Frontend reads servings from import response

The CreateRecipePage SHALL read `data.recipe_draft.servings` (not `portions`) from the import response for portion normalization. The Zod schema `RecipeDraftSchema` SHALL use `servings` as the field name.

#### Scenario: Import normalizes quantities from servings
- **WHEN** an imported recipe has `servings: 4` and the user confirms normalization to 1 portion
- **THEN** all ingredient quantities SHALL be divided by `detectedServings` (4)
- **THEN** the recipe SHALL be saved with `portions: 1`

#### Scenario: Import with servings=1
- **WHEN** an imported recipe has `servings: 1`
- **THEN** the normalization dialog SHALL NOT be shown
- **THEN** quantities SHALL be used as-is

### Requirement: Import-Flow Portionsvalidierung
Beim Rezept-Import aus URL MUSS der Import-Stepper einen expliziten Validierungsschritt enthalten, in dem der User die erkannte Portionsanzahl bestätigt oder korrigiert. Die Mengen werden automatisch auf 1 Portion normalisiert.

#### Scenario: Import mit servings > 1 zeigt Normalisierungs-Schritt
- **WHEN** ein Rezept per URL importiert wird und die Quelle `servings > 1` zurückgibt
- **THEN** der Stepper SHALL einen Schritt "Portionsmenge prüfen" anzeigen mit der erkannten Portionsanzahl und den Original-Mengen
- **THEN** der User MUSS bestätigen oder die Portionsanzahl korrigieren

#### Scenario: Automatische Normalisierung auf 1 Portion
- **WHEN** der User die Portionsanzahl bestätigt (z.B. `servings=4`)
- **THEN** alle importierten Mengen SHALL durch die Portionsanzahl geteilt und als per-1-Portion gespeichert werden
- **THEN** `servings` SHALL auf `1` gesetzt werden

#### Scenario: Import mit servings=1 überspringt Normalisierung
- **WHEN** ein Rezept per URL importiert wird und die Quelle `servings=1` zurückgibt
- **THEN** der Normalisierungs-Schritt SHALL übersprungen werden

#### Scenario: User kann Portionsanzahl manuell korrigieren
- **WHEN** die erkannte Portionsanzahl falsch ist
- **THEN** der User SHALL die korrekte Anzahl eingeben können
- **THEN** die Mengen SHALL mit dem korrigierten Wert normalisiert werden

### Requirement: Neue Zutaten in Vorschau als NEU markiert
Das Frontend SHALL Zutaten, die vom Import neu erstellt wurden, in der Vorschau visuell als "NEU" kennzeichnen.

#### Scenario: Neue Zutat erkennbar
- **WHEN** der Import eine neue Zutat erstellt hat (`is_new_ingredient=true`)
- **THEN** SHALL die Vorschau diese Zutat mit einem "Neu"-Badge markieren

#### Scenario: Bestehende Zutat ohne Markierung
- **WHEN** eine Zutat aus der DB gematcht wurde (`is_new_ingredient=false`)
- **THEN** SHALL kein Badge angezeigt werden

### Requirement: Lesbare Namen in der Vorschau
Die Import-Vorschau SHALL für jede Zutat den lesbaren `ingredient_name` und `measuring_unit_name` anzeigen, nicht technische IDs oder Feldnamen.

#### Scenario: Zutatenliste zeigt Namen
- **WHEN** die Import-Vorschau Zutaten anzeigt
- **THEN** SHALL jede Zutat als "{quantity} {measuring_unit_name} {ingredient_name}" dargestellt werden (z.B. "2 EL Olivenöl")

### Requirement: URL-Import stabil auf Production

Der Rezept-URL-Import (z.B. von Chefkoch) SHALL auf der Production-Umgebung stabil funktionieren. Fehler SHALL dem Nutzer klar kommuniziert werden.

#### Scenario: URL-Import schlägt fehl

- **WHEN** der URL-Import auf Production einen Fehler wirft
- **THEN** wird dem Nutzer angezeigt: „Import fehlgeschlagen — bitte URL prüfen oder Rezept manuell anlegen"
- **THEN** wird kein leerer weißer Screen angezeigt

#### Scenario: URL-Import erfolgreich auf Production

- **WHEN** der Nutzer eine gültige Rezept-URL eingibt
- **THEN** funktioniert der Import auf Production identisch wie lokal

#### Scenario: Fehlerdiagnose

- **WHEN** der URL-Import auf Production fehlschlägt
- **THEN** wird der Fehler in Sentry geloggt mit der verwendeten URL (anonymisiert falls nötig)
