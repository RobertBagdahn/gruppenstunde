## ADDED Requirements

### Requirement: URL-Import-Endpoint für Zutaten
Das System SHALL einen POST-Endpoint unter `/api/ingredients/import-from-url/` bereitstellen, der eine URL entgegennimmt, die Seite via Gemini scraped (mit Google Search Grounding), und ein strukturiertes Zutat-Entwurf-Objekt zurückgibt. Die KI erkennt die Quellart selbst (Produktseite, Open Food Facts, USDA FDC, Rezeptseite etc.).

#### Scenario: Successful URL import
- **WHEN** an authenticated user sends `POST /api/ingredients/import-from-url/` with `{ "url": "https://www.rewe.de/..." }`
- **THEN** the system SHALL call Gemini with the URL and receive a structured ingredient draft
- **THEN** the response SHALL contain `ingredient_draft` with at minimum `name` populated
- **THEN** optional fields (`description`, `retail_section_id`, `energy_kcal`, `protein_g`, etc.) SHALL be null if not determinable from the source
- **THEN** the HTTP status SHALL be 200

#### Scenario: URL is unreachable or empty page
- **WHEN** the URL cannot be scraped or returns no usable content
- **THEN** the system SHALL return HTTP 422 with a German error message

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends a request
- **THEN** the system SHALL return HTTP 403

#### Scenario: Gemini rate limit exceeded
- **WHEN** the Gemini quota is exhausted
- **THEN** the system SHALL return HTTP 429 with a German error message

---

### Requirement: URL-Import-Modus im Ingredient-Stepper
Der URL-Import-Modus erscheint als dritte Karte in Step 0 des `ContentStepper` auf der `/ingredients/new`-Page, analog zum URL-Import bei Rezepten. Ein Modal mit URL-Eingabe öffnet sich, ruft den Endpoint auf und springt bei Erfolg direkt zu Step 1 mit vorausgefüllten Feldern.

#### Scenario: User selects "Mit Link" in Step 0
- **WHEN** a user clicks the "Mit Link" card in Step 0
- **THEN** a modal overlay SHALL open with a URL input field and submit button
- **THEN** the modal SHALL have a "Abbrechen"-button to return to Step 0

#### Scenario: Successful URL import in stepper
- **WHEN** a user enters a valid URL and submits the modal
- **THEN** the system SHALL call `POST /api/ingredients/import-from-url/` and show a loading indicator
- **THEN** on success the modal SHALL close and the stepper SHALL advance directly to Step 1
- **THEN** Step 1 SHALL be pre-filled with `name`, `description`, `retail_section_id` from the response
- **THEN** a toast SHALL inform the user how many fields were successfully extracted (e.g. "3 Felder aus der URL extrahiert")

#### Scenario: URL import fails in modal
- **WHEN** the import request fails
- **THEN** the system SHALL display a German error message inside the modal
- **THEN** the user SHALL remain in the modal and be able to correct the URL or cancel

---

### Requirement: Frontend-Hook für URL-Import von Zutaten
Das System SHALL einen TanStack-Query-Mutations-Hook `useIngredientImportUrl()` bereitstellen, der `POST /api/ingredients/import-from-url/` aufruft.

#### Scenario: Hook is available and typed
- **WHEN** `useIngredientImportUrl()` is used in a component
- **THEN** it SHALL return a `mutateAsync` function accepting `{ url: string }`
- **THEN** the return type SHALL be `IngredientImportUrlOut` matching the backend Pydantic schema
- **THEN** no `any` types SHALL be used (TypeScript strict mode)

#### Scenario: Hook handles errors
- **WHEN** the mutation fails
- **THEN** the error SHALL be a typed API error compatible with the project's error-handling spec
- **THEN** the calling component SHALL be able to display a German error message from the error response
