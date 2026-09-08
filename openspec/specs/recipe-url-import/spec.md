# recipe-url-import Specification

## Purpose
Diese Spec definiert den URL-Import von Rezepten einschließlich Vorschau, Portionen und Quellen-URL innerhalb des vereinheitlichten Smart-Eingabeflusses.

## Requirements

### Requirement: URL Import Option in Recipe Creation UI
Der URL-Import SHALL keine eigenständige Auswahloption mehr sein. Die Rezepterstellung SHALL ein einzelnes Smart-Eingabefeld anbieten, das eine URL entgegennimmt und den Importpfad serverseitig auslöst.

#### Scenario: User pastes a recipe URL
- **WHEN** the user pastes a URL into the smart input field and triggers the analysis
- **THEN** the system SHALL detect the input as a URL server-side
- **THEN** the system SHALL run the enhanced import pipeline
- **THEN** no method selection cards SHALL be shown

#### Scenario: Keine separate Importmethode mehr wählbar
- **WHEN** ein Nutzer die Rezepterstellung öffnet
- **THEN** SHALL keine Option "Von URL importieren" als eigene Auswahl erscheinen

### Requirement: Recipe Import from URL Endpoint
The system SHALL provide an import endpoint that accepts the smart input value and returns a parsed recipe preview with matched or created ingredients. The response SHALL include the number of servings of the original recipe, preparation steps, source URL, the detected input type, a flag indicating whether the data was reconstructed via search grounding, and all fields required by the synchronized frontend Zod schema. Every returned recipe item SHALL either carry a usable portion reference or be explicitly flagged as requiring user clarification.

#### Scenario: Successful import returns complete preview
- **WHEN** a user submits a URL containing valid recipe data
- **THEN** the response SHALL include servings, metadata, steps, recipe items, and created ingredients
- **THEN** each returned recipe item SHALL include a usable portion reference or an explicit clarification flag
- **THEN** no recipe item SHALL carry a null portion reference without that flag

#### Scenario: Successful import from schema.org JSON-LD
- **WHEN** a user submits a URL containing valid schema.org/Recipe JSON-LD markup
- **THEN** the system SHALL parse the structured data first
- **THEN** the preview SHALL contain title, description, servings, ingredients, steps, and durations when present

#### Scenario: Successful import via search grounding fallback
- **WHEN** the direct page fetch fails with a source error
- **THEN** the system SHALL attempt reconstruction via Gemini with Google Search Grounding
- **THEN** the response SHALL mark the result as reconstructed

#### Scenario: Import uses one canonical user-facing flow
- **WHEN** the user creates a recipe from a URL
- **THEN** the smart input field SHALL be the only user-facing entry point
- **THEN** no alternative import page SHALL exist

#### Scenario: Invalid or unreachable URL
- **WHEN** a user submits a malformed URL, or neither direct fetch nor grounding yields recipe data
- **THEN** the system SHALL return HTTP 422 with a German error message
- **THEN** no recipe draft SHALL be created

#### Scenario: Response contract matches the frontend schema
- **WHEN** the endpoint returns a successful response containing tags
- **THEN** the frontend Zod validation SHALL succeed without error

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
Jede zurückgegebene Rezeptposition SHALL Menge und Einheit tragen. Kann keine Einheit aufgelöst werden, SHALL die Position als klärungsbedürftig gekennzeichnet werden, anstatt ohne Portionsbezug gespeichert zu werden.

#### Scenario: Einheit ist auflösbar
- **WHEN** für eine Zutat eine Einheit erkannt wird
- **THEN** SHALL die Position eine aufgelöste Portion mit dieser Einheit erhalten

#### Scenario: Einheit ist nicht auflösbar
- **WHEN** für eine Zutat keine Einheit erkannt wird
- **THEN** SHALL die Position als klärungsbedürftig gekennzeichnet werden
- **THEN** SHALL ein KI-Vorschlag für die Einheit mitgeliefert werden
- **THEN** SHALL die Menge nicht stillschweigend als Gramm interpretiert werden

#### Scenario: Klärung erfolgt vor dem Speichern
- **WHEN** der Nutzer die Einheit einer klärungsbedürftigen Position festlegt
- **THEN** SHALL die Position eine gültige Portion erhalten
- **THEN** SHALL das Rezept gespeichert werden können

### Requirement: Source URL Storage
The system SHALL store the original import URL on the Recipe model in a `source_url` field when the user saves an imported draft.

#### Scenario: Source URL persisted
- **WHEN** a recipe draft created from a URL is saved
- **THEN** the Recipe.source_url field SHALL contain the original URL

#### Scenario: Editing a draft does not replace the source
- **WHEN** the user changes title or ingredients before saving an imported draft
- **THEN** the original import URL SHALL remain unchanged

### Requirement: Preview Before Save
The system SHALL persist the recipe draft immediately after the user confirms the URL import preview. After successful draft creation via `POST /api/recipes/`, the Wizard navigates to Step 1 (Basis & Portionen) before the user reviews and edits the imported ingredients in Step 2 (Zutaten) using the InlineIngredientEditor.

#### Scenario: User reviews and edits before saving
- **WHEN** the user confirms the URL import preview
- **THEN** the system SHALL create a recipe draft via `POST /api/recipes/` with the imported data and `status="draft"`
- **THEN** the Wizard SHALL navigate to Step 1 (Basis & Portionen) before showing the imported ingredients in Step 2 (Zutaten) in the InlineIngredientEditor
- **THEN** the user can modify title, recipe type, ingredients before proceeding

### Requirement: Loading State During Import
The system SHALL display a loading indicator with the message "Rezept wird analysiert... Das kann einen Moment dauern." during the import process.

#### Scenario: Long-running import
- **WHEN** the import takes more than 1 second
- **THEN** the loading message SHALL remain visible until the response arrives or an error occurs

### Requirement: Single Gemini Call for All Ingredients
Der Import SHALL alle Zutaten in einem einzigen KI-Aufruf verarbeiten. Die Zuordnung zwischen Quellzutat und KI-Ergebnis SHALL über eine stabile, nicht textbasierte Referenz erfolgen, sodass keine Duplikate entstehen.

#### Scenario: Ein Aufruf für alle Zutaten
- **WHEN** ein Rezept mit mehreren Zutaten importiert wird
- **THEN** SHALL genau ein KI-Aufruf für die Zutatenverarbeitung erfolgen

#### Scenario: Zuordnung ist unabhängig von der Schreibweise
- **WHEN** die KI eine Zutat mit abweichender Schreibweise oder Mengenpräfix zurückgibt
- **THEN** SHALL die Zuordnung über die stabile Referenz gelingen
- **THEN** SHALL keine zusätzliche Rezeptposition entstehen

#### Scenario: Positionsanzahl entspricht der Quelle
- **WHEN** die Quelle zehn Zutaten enthält
- **THEN** SHALL das Ergebnis zehn Rezeptpositionen enthalten

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
Der vereinheitlichte Wizard SHALL im Schritt "Basis & Portionen" die erkannte Personenzahl anzeigen und vom Nutzer bestätigen oder korrigieren lassen, bevor Zutatenmengen dargestellt werden. Die Mengen SHALL beim Speichern automatisch auf eine Portion normalisiert werden.

#### Scenario: Erkannte Personenzahl wird bestätigt
- **WHEN** die Analyse eine Personenzahl liefert
- **THEN** SHALL der Schritt "Basis & Portionen" diesen Wert vorbelegt anzeigen
- **THEN** SHALL der Nutzer bestätigen oder korrigieren können

#### Scenario: Automatische Normalisierung auf 1 Portion
- **WHEN** der Nutzer die Personenzahl bestätigt
- **THEN** SHALL alle Mengen durch diese Zahl geteilt und als Menge pro Portion gespeichert werden
- **THEN** SHALL die gespeicherte Portionszahl 1 betragen

#### Scenario: Keine Personenzahl erkannt
- **WHEN** die Analyse keine verlässliche Personenzahl liefert
- **THEN** SHALL der Nutzer zur Eingabe aufgefordert werden
- **THEN** SHALL der Schritt ohne Eingabe nicht verlassen werden können

#### Scenario: Hilfetext erklärt die Normierung
- **WHEN** der Schritt "Basis & Portionen" aktiv ist
- **THEN** SHALL ein deutscher Hilfetext die interne Normierung auf eine Portion erklären

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
Der Rezept-URL-Import SHALL auf der Production-Umgebung stabil funktionieren und MUST NICHT mit HTTP 500 antworten, wenn Portionsnamen kollidieren. Fehler SHALL dem Nutzer klar auf Deutsch kommuniziert werden.

#### Scenario: Wiederholter Import derselben Quelle
- **WHEN** dieselbe Rezept-URL mehrfach importiert wird
- **THEN** SHALL jeder Import erfolgreich abschließen
- **THEN** SHALL kein `IntegrityError` auftreten

#### Scenario: Portionsname kollidiert mit bestehendem Datensatz
- **WHEN** eine anzulegende Portion einen bereits vergebenen Namen bei derselben Zutat trägt
- **THEN** SHALL das System einen eindeutigen Namen verwenden
- **THEN** SHALL der Import mit HTTP 200 antworten

#### Scenario: Chefkoch-Rezept wird vollständig importiert
- **WHEN** ein Chefkoch-Rezept mit strukturierten Daten importiert wird
- **THEN** SHALL Titel, Personenzahl, alle Zutaten und alle Zubereitungsschritte übernommen werden
