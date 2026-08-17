## MODIFIED Requirements

### Requirement: UnknownIngredientDialog "neu anlegen" navigiert zu /ingredients/new
Wenn ein User im Rezept-Editor eine Zutat tippt, die nicht existiert, und "neu anlegen" klickt, soll er zur neuen Erstellungspage navigieren statt einer Fehlermeldung zu erhalten.

#### Scenario: User clicks "neu anlegen" in UnknownIngredientDialog
- **WHEN** a user clicks the "neu anlegen" button in `UnknownIngredientDialog`
- **THEN** the system SHALL navigate to `/ingredients/new?prefillName=<query>&redirectTo=<current page URL>`
- **THEN** no toast error SHALL be shown

#### Scenario: Guard code is removed
- **WHEN** `handleAddIngredient` is called with an ingredient without a slug
- **THEN** the system SHALL NOT show a "Bitte eine bestehende Zutat ausw�hlen" error
- **THEN** the system SHALL instead navigate to `/ingredients/new`

### Requirement: Stepper Step 1 zeigt nur Stammdaten
Step 1 enth�lt ausschlie�lich die Stammdaten-Felder einer Zutat. Alle anderen Felder (N�hrwerte, Scores, physikalische Eigenschaften) sind auf der Detailseite bearbeitbar.

#### Scenario: Step 1 field set
- **WHEN** Step 1 is rendered (regardless of mode)
- **THEN** the form SHALL contain exactly: `name` (required text input), `description` (optional text area), `status` (select: draft/approved), `retail_section` (optional select/autocomplete)
- **THEN** the form SHALL NOT contain nutritional fields, score fields, physical property fields, or scout fields

#### Scenario: Step 1 validation
- **WHEN** a user tries to proceed to Step 2 without a name
- **THEN** the system SHALL show a German validation error on the name field
- **THEN** the stepper SHALL NOT advance to Step 2

#### Scenario: Name pre-filled from query parameter
- **WHEN** `/ingredients/new?prefillName=Haferflocken` is loaded
- **THEN** the name field in Step 1 SHALL be pre-filled with "Haferflocken"

### Requirement: Stepper Step 2 — Vorschau & Speichern
Step 2 zeigt eine Vorschau der eingegebenen Daten und einen Speichern-Button. Nach dem Speichern navigiert das System zur Detailseite der Zutat oder zur Redirect-URL.

#### Scenario: Saving a new ingredient (manual or URL mode)
- **WHEN** a user clicks "Speichern" in Step 2 and no ingredient has been pre-created (manual/URL mode)
- **THEN** the system SHALL call `POST /api/ingredients/` with the form data
- **THEN** on success the system SHALL navigate to the `redirectTo` URL if provided, with `?newIngredientSlug=<slug>` appended, otherwise navigate to `/ingredients/<slug>`
- **THEN** a success toast SHALL be shown

#### Scenario: Saving after AI mode (ingredient already exists)
- **WHEN** the AI mode was used and the ingredient was already created by `ai-create`
- **THEN** the system SHALL call `PATCH /api/ingredients/<slug>/` to apply any edits from Step 1
- **THEN** on success the system SHALL navigate to the `redirectTo` URL if provided, with `?newIngredientSlug=<slug>` appended, otherwise navigate to `/ingredients/<slug>`

#### Scenario: Save fails
- **WHEN** the save request fails
- **THEN** the system SHALL display a German error toast
- **THEN** the user SHALL remain on Step 2

## ADDED Requirements

### Requirement: Query-Parameter Support f�r Prefill und Redirect
Die CreateIngredientPage SHALL die Query-Parameter `?prefillName=` und `?redirectTo=` unterst�tzen, um einen kontextbezogenen Erstellungs-Workflow zu erm�glichen.

#### Scenario: Step 0 wird bei prefillName �bersprungen
- **WHEN** `/ingredients/new?prefillName=Haferflocken` aufgerufen wird
- **THEN** the stepper SHALL skip Step 0 (mode selection) and advance directly to Step 1 (manual mode)
- **THEN** der Name SHALL in Step 1 vorausgef�llt sein
- **THEN** die Step-0-Karten SHALL �ber den Stepper-Indikator (Zur�ck-Button) weiterhin erreichbar sein

#### Scenario: redirectTo mit Recipe-ID
- **WHEN** `/ingredients/new?redirectTo=/recipes/123` aufgerufen wird und die Zutat erfolgreich gespeichert wurde
- **THEN** das System SHALL zu `/recipes/123?newIngredientSlug=<slug>` navigieren

#### Scenario: Kein redirectTo gesetzt (Standardverhalten)
- **WHEN** `/ingredients/new` ohne `redirectTo` aufgerufen wird
- **THEN** das System SHALL nach dem Speichern wie bisher zu `/ingredients/<slug>` navigieren

#### Scenario: Unvollst�ndige Redirect-URL (relative path)
- **WHEN** `?redirectTo=/recipes/123` gesetzt ist (relative URL)
- **THEN** das System SHALL den Pfad relativ zur aktuellen Domain behandeln und `?newIngredientSlug=<slug>` anh�ngen
