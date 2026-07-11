## ADDED Requirements

### Requirement: Ingredient creation page with mode selection
The system SHALL provide a guided ingredient creation flow at `/ingredients/new` using the existing `ContentStepper` component. The flow SHALL present three creation modes in Step 0, collect essential fields (Stammdaten) in Step 1, and show a preview with save action in Step 2.

#### Scenario: User navigates to /ingredients/new
- **WHEN** an authenticated user navigates to `/ingredients/new`
- **THEN** the system SHALL display the `ContentStepper` with three mode cards: "Mit KI-Hilfe", "Manuell", "Mit Link"
- **WHEN** an unauthenticated user navigates to `/ingredients/new`
- **THEN** the system SHALL display an authentication gate (no redirect)

#### Scenario: Mode cards are displayed correctly
- **WHEN** Step 0 is rendered
- **THEN** three cards SHALL be visible: KI-Modus, Manuell, Mit Link (URL-Import)
- **THEN** the layout SHALL use a 3-column grid on desktop, 1-column on mobile

---

### Requirement: KI-Modus für Zutaten-Erstellung
Im KI-Modus gibt der User einen Namen ein, und das System ruft `POST /api/ingredients/ai-create/` auf. Das Ergebnis füllt die Felder in Step 1 vor.

#### Scenario: Successful AI creation
- **WHEN** a user enters a name (e.g. "Haferflocken") in the KI input and submits
- **THEN** the system SHALL call `POST /api/ingredients/ai-create/` with `{ "name": "Haferflocken" }`
- **THEN** on success the stepper SHALL auto-advance to Step 1 with `name`, `description`, `status`, and `retail_section_id` pre-filled from the API response
- **THEN** the created ingredient's `slug` SHALL be tracked in component state for the final save step

#### Scenario: AI creation while loading
- **WHEN** the AI request is in-flight
- **THEN** the system SHALL display a loading indicator and disable the submit button

#### Scenario: AI creation fails
- **WHEN** the AI request fails (network error, rate limit, etc.)
- **THEN** the system SHALL display a German error toast
- **THEN** the user SHALL remain on Step 0 and be able to retry or switch to Manuell

#### Scenario: User aborts AI creation
- **WHEN** a user clicks the abort button while the AI request is pending
- **THEN** the request SHALL be cancelled via `AbortController`
- **THEN** the system SHALL show a fallback UI offering retry or manual mode

---

### Requirement: Manuell-Modus für Zutaten-Erstellung
Im manuellen Modus springt der User direkt zu Step 1 mit leerem Formular.

#### Scenario: Manual mode selected
- **WHEN** a user clicks the "Manuell" card in Step 0
- **THEN** the stepper SHALL immediately advance to Step 1 with all fields empty
- **THEN** no API call SHALL be made before Step 1

---

### Requirement: Stepper Step 1 zeigt nur Stammdaten
Step 1 enthält ausschließlich die Stammdaten-Felder einer Zutat. Alle anderen Felder (Nährwerte, Scores, physikalische Eigenschaften) sind auf der Detailseite bearbeitbar.

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

---

### Requirement: Stepper Step 2 — Vorschau & Speichern
Step 2 zeigt eine Vorschau der eingegebenen Daten und einen Speichern-Button. Nach dem Speichern navigiert das System zur Detailseite der Zutat.

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

---

### Requirement: Query-Parameter Support für Prefill und Redirect
Die CreateIngredientPage SHALL die Query-Parameter `?prefillName=` und `?redirectTo=` unterstützen, um einen kontextbezogenen Erstellungs-Workflow zu ermöglichen.

#### Scenario: Step 0 wird bei prefillName übersprungen
- **WHEN** `/ingredients/new?prefillName=Haferflocken` aufgerufen wird
- **THEN** the stepper SHALL skip Step 0 (mode selection) and advance directly to Step 1 (manual mode)
- **THEN** der Name SHALL in Step 1 vorausgefüllt sein
- **THEN** die Step-0-Karten SHALL über den Stepper-Indikator (Zurück-Button) weiterhin erreichbar sein

#### Scenario: redirectTo mit Recipe-ID
- **WHEN** `/ingredients/new?redirectTo=/recipes/123` aufgerufen wird und die Zutat erfolgreich gespeichert wurde
- **THEN** das System SHALL zu `/recipes/123?newIngredientSlug=<slug>` navigieren

#### Scenario: Kein redirectTo gesetzt (Standardverhalten)
- **WHEN** `/ingredients/new` ohne `redirectTo` aufgerufen wird
- **THEN** das System SHALL nach dem Speichern wie bisher zu `/ingredients/<slug>` navigieren

#### Scenario: Unvollständige Redirect-URL (relative path)
- **WHEN** `?redirectTo=/recipes/123` gesetzt ist (relative URL)
- **THEN** das System SHALL den Pfad relativ zur aktuellen Domain behandeln und `?newIngredientSlug=<slug>` anhängen

---

### Requirement: UnknownIngredientDialog "neu anlegen" navigiert zu /ingredients/new
Wenn ein User im Rezept-Editor eine Zutat tippt, die nicht existiert, und "neu anlegen" klickt, soll er zur neuen Erstellungspage navigieren statt einer Fehlermeldung zu erhalten.

#### Scenario: User clicks "neu anlegen" in UnknownIngredientDialog
- **WHEN** a user clicks the "neu anlegen" button in `UnknownIngredientDialog`
- **THEN** the system SHALL navigate to `/ingredients/new?prefillName=<query>&redirectTo=<current page URL>`
- **THEN** no toast error SHALL be shown

#### Scenario: Guard code is removed
- **WHEN** `handleAddIngredient` is called with an ingredient without a slug
- **THEN** the system SHALL NOT show a "Bitte eine bestehende Zutat auswählen" error
- **THEN** the system SHALL instead navigate to `/ingredients/new?prefillName=<query>&redirectTo=<current page URL>`
