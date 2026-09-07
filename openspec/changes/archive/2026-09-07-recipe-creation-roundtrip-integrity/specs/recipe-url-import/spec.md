## MODIFIED Requirements

### Requirement: URL Import Option in Recipe Creation UI
The system SHALL display a third option "Von URL importieren" in the RecipeWizard Step 0 (Methoden-Wahl) alongside "Manuell" and "Mit KI-Hilfe". Selecting the option SHALL expose the URL input and the canonical import action used by the enhanced import endpoint.

#### Scenario: User selects URL import
- **WHEN** the user clicks the "Von URL importieren" option in Wizard Step 0
- **THEN** the system SHALL display a URL input field and an actionable import control
- **THEN** activating the control SHALL call `POST /api/recipes/import-from-url-enhanced/`

### Requirement: Recipe Import from URL Endpoint
The system SHALL provide a `POST /api/recipes/import-from-url-enhanced/` endpoint that accepts a JSON body with a `url` field and returns a parsed recipe preview with matched/created ingredients. The response SHALL include `recipe_draft.servings` (number of servings of the original recipe), preparation steps, source URL, and all fields required by the synchronized frontend Zod schema.

#### Scenario: Successful import returns complete preview
- **WHEN** a user submits a URL containing valid recipe data
- **THEN** the response SHALL include `recipe_draft.servings`, metadata, steps, `recipe_items`, and `created_ingredients`
- **THEN** each returned recipe item SHALL include a usable `portion_id` or an explicit review-safe null value

#### Scenario: Successful import from schema.org JSON-LD
- **WHEN** a user submits a URL containing valid schema.org/Recipe JSON-LD markup
- **THEN** the system SHALL parse the structured data first
- **THEN** the preview SHALL contain title, description, servings, ingredients, steps, and durations when present

#### Scenario: Import uses one canonical user-facing flow
- **WHEN** the user imports a recipe from either the wizard or the standalone import page
- **THEN** both interfaces SHALL use the enhanced endpoint and the same response contract
- **THEN** neither interface SHALL silently fall back to a different user-facing parser contract

### Requirement: URL-Import stabil auf Production
Der Rezept-URL-Import (z.B. von Chefkoch) SHALL auf der Production-Umgebung stabil funktionieren. Fehler SHALL dem Nutzer klar kommuniziert werden. The import implementation SHALL support complete extraction from supported Chefkoch structured-data or fallback fixtures.

#### Scenario: URL-Import schlägt fehl
- **WHEN** der URL-Import auf Production einen Fehler wirft
- **THEN** wird dem Nutzer angezeigt: „Import fehlgeschlagen — bitte URL prüfen oder Rezept manuell anlegen"
- **THEN** wird kein leerer weißer Screen angezeigt

#### Scenario: URL-Import erfolgreich auf Production
- **WHEN** der Nutzer eine gültige unterstützte Chefkoch-Rezept-URL eingibt
- **THEN** funktioniert der Import auf Production identisch wie lokal
- **THEN** Titel, Zutaten, Portionszahl und Zubereitung werden in der Preview angezeigt

#### Scenario: Fehlerdiagnose
- **WHEN** der URL-Import auf Production fehlschlägt
- **THEN** wird der Fehler in Sentry geloggt mit der verwendeten URL (anonymisiert falls nötig)
