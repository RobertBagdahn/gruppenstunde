## ADDED Requirements

### Requirement: Persons list page route
A new route `/events/app/persons` SHALL be created to display a CRUD list page for managing Person records. This page is frontend-only and uses the existing Person API at `/api/persons/`.

#### Scenario: Persons page is accessible via route
- **WHEN** a logged-in user navigates to `/events/app/persons`
- **THEN** the PersonsListPage component SHALL be rendered
- **THEN** the page SHALL display the heading "Personen"

#### Scenario: Unauthenticated user visits persons page
- **WHEN** an unauthenticated user navigates to `/events/app/persons`
- **THEN** they SHALL be redirected to the login page

### Requirement: Persons list with pagination
The persons page SHALL display a paginated list of all Person records belonging to the authenticated user, following the same UI pattern as IngredientListPage.

#### Scenario: List displays person records
- **WHEN** the persons page loads
- **THEN** the system SHALL call `GET /api/persons/?page=1&page_size=20`
- **THEN** each row SHALL display: full name (last_name, first_name), scout_name (if set), email, and city
- **THEN** pagination controls SHALL be displayed when total exceeds page_size

#### Scenario: Empty state
- **WHEN** the user has no Person records
- **THEN** an empty state message "Noch keine Personen vorhanden." SHALL be displayed
- **THEN** a "Person erstellen" button SHALL be prominently shown

### Requirement: Search persons by name
The persons list SHALL support searching by name.

#### Scenario: Search filters results
- **WHEN** a user types a search term into the search input field
- **THEN** the list SHALL be filtered to show only persons whose first_name, last_name, or scout_name matches the search term
- **THEN** the search SHALL be debounced (300ms) to avoid excessive API calls
- **THEN** the search term SHALL be persisted as a URL parameter `?search=`

#### Scenario: Clear search
- **WHEN** a user clears the search input
- **THEN** the full unfiltered list SHALL be displayed

### Requirement: Filter persons by group
The persons list SHALL support filtering by group membership.

#### Scenario: Group filter dropdown
- **WHEN** the persons page loads
- **THEN** a group filter dropdown SHALL be displayed with the option "Alle Gruppen" selected by default
- **THEN** the dropdown SHALL list all groups the user belongs to

#### Scenario: Filtering by group
- **WHEN** a user selects a group from the filter dropdown
- **THEN** the list SHALL be filtered to show only persons associated with that group
- **THEN** the selected group SHALL be persisted as a URL parameter `?group=`

### Requirement: Create person dialog
A dialog SHALL allow users to create new Person records.

#### Scenario: Open create dialog
- **WHEN** a user clicks the "Person erstellen" button
- **THEN** a dialog SHALL open with the title "Neue Person"
- **THEN** the dialog SHALL contain a form with the following fields:
  - Pfadfindername (scout_name) — text input, optional
  - Vorname (first_name) — text input, required
  - Nachname (last_name) — text input, required
  - Adresse (address) — text input, optional
  - PLZ (zip_code) — text input, optional
  - Stadt (city) — text input, optional
  - E-Mail (email) — email input, optional
  - Geburtstag (birthday) — date picker, optional
  - Geschlecht (gender) — select dropdown with GenderChoices, default "Keine Angabe"
  - Ernährungstags (nutritional_tags) — multi-select, optional

#### Scenario: Submit create form
- **WHEN** a user fills in at least first_name and last_name and clicks "Erstellen"
- **THEN** the system SHALL call `POST /api/persons/` with the form data
- **THEN** on success, the dialog SHALL close
- **THEN** the persons list SHALL refresh to include the new person
- **THEN** a success toast "Person wurde erstellt." SHALL be displayed

#### Scenario: Validation error on create
- **WHEN** a user submits the form without required fields (first_name or last_name)
- **THEN** inline validation errors SHALL be displayed on the respective fields
- **THEN** the form SHALL NOT be submitted

### Requirement: Edit person dialog
A dialog SHALL allow users to edit existing Person records.

#### Scenario: Open edit dialog
- **WHEN** a user clicks the edit button (pencil icon) on a person row
- **THEN** a dialog SHALL open with the title "Person bearbeiten"
- **THEN** all fields SHALL be pre-filled with the person's current data

#### Scenario: Submit edit form
- **WHEN** a user modifies fields and clicks "Speichern"
- **THEN** the system SHALL call `PATCH /api/persons/{id}/` with the changed data
- **THEN** on success, the dialog SHALL close
- **THEN** the persons list SHALL refresh with the updated data
- **THEN** a success toast "Person wurde aktualisiert." SHALL be displayed

### Requirement: Delete person with confirmation
A person record SHALL be deletable with a confirmation step.

#### Scenario: Delete confirmation dialog
- **WHEN** a user clicks the delete button (trash icon) on a person row
- **THEN** a confirmation dialog SHALL appear with the message "Möchtest du {first_name} {last_name} wirklich löschen?"
- **THEN** the dialog SHALL include a warning: "Bestehende Anmeldungen dieser Person bleiben erhalten."

#### Scenario: Confirm delete
- **WHEN** a user clicks "Löschen" in the confirmation dialog
- **THEN** the system SHALL call `DELETE /api/persons/{id}/`
- **THEN** on success, the person SHALL be removed from the list
- **THEN** a success toast "Person wurde gelöscht." SHALL be displayed

#### Scenario: Cancel delete
- **WHEN** a user clicks "Abbrechen" in the confirmation dialog
- **THEN** the dialog SHALL close without deleting the person

### Requirement: Link from event landing page
The event landing page SHALL include a link to the persons management page.

#### Scenario: Persons link on landing page
- **WHEN** a logged-in user views the event landing page at `/events/app`
- **THEN** a card or link labeled "Personen verwalten" SHALL be displayed in the quick actions area
- **THEN** clicking it SHALL navigate to `/events/app/persons`

#### Scenario: Link not visible for unauthenticated users
- **WHEN** an unauthenticated user views the event landing page
- **THEN** the "Personen verwalten" link SHALL NOT be displayed
