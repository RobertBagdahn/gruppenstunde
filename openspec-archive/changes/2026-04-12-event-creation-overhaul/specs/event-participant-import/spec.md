## ADDED Requirements

### Requirement: Import API endpoint
A new `POST /api/events/{slug}/import/` endpoint SHALL accept a multipart form upload containing a CSV or Excel file to import participants.

#### Scenario: Successful CSV import
- **WHEN** POST `/api/events/{slug}/import/` with a CSV file and column mapping `{column_mapping: {0: "first_name", 1: "last_name", 2: "email", 3: "scout_name", 4: "booking_option"}, has_header: true}`
- **THEN** the backend SHALL parse the CSV file
- **THEN** for each valid row, a Person record SHALL be created (or matched by email if existing)
- **THEN** for each valid row, a Registration and Participant SHALL be created
- **THEN** the response SHALL return 200 OK with `{created: number, skipped: number, errors: [{row: number, message: string}]}`

#### Scenario: Successful Excel import
- **WHEN** POST `/api/events/{slug}/import/` with an `.xlsx` file and column mapping
- **THEN** the backend SHALL parse the Excel file using the same logic as CSV
- **THEN** the response format SHALL be identical to CSV import

#### Scenario: Invalid file format
- **WHEN** POST `/api/events/{slug}/import/` with a file that is not CSV or Excel (e.g. `.pdf`, `.txt`)
- **THEN** the response SHALL return 400 Bad Request with message "Ungültiges Dateiformat. Bitte lade eine CSV- oder Excel-Datei hoch."

#### Scenario: Empty file
- **WHEN** POST `/api/events/{slug}/import/` with an empty file
- **THEN** the response SHALL return 400 Bad Request with message "Die Datei enthält keine Daten."

#### Scenario: Only managers can import
- **WHEN** POST `/api/events/{slug}/import/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Import preview endpoint
A `POST /api/events/{slug}/import/preview/` endpoint SHALL parse the uploaded file and return a preview without creating records.

#### Scenario: Preview returns parsed data
- **WHEN** POST `/api/events/{slug}/import/preview/` with a CSV or Excel file
- **THEN** the response SHALL return 200 OK with:
  - `headers` — list of column names from the file (or generated names like "Spalte 1", "Spalte 2" if no header row)
  - `rows` — first 10 rows of data as list of lists
  - `total_rows` — total number of data rows in the file

#### Scenario: Only managers can preview
- **WHEN** POST `/api/events/{slug}/import/preview/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Row-level validation
The import endpoint SHALL validate each row individually and report errors per row.

#### Scenario: Missing required fields
- **WHEN** a row is missing `first_name` or `last_name` based on the column mapping
- **THEN** the row SHALL be skipped
- **THEN** the error SHALL be recorded as `{row: <row_number>, message: "Vorname und Nachname sind Pflichtfelder."}`

#### Scenario: Invalid booking option
- **WHEN** a row references a booking_option name that does not exist for this event
- **THEN** the row SHALL be skipped
- **THEN** the error SHALL be recorded as `{row: <row_number>, message: "Buchungsoption '{name}' nicht gefunden."}`

#### Scenario: Invalid email format
- **WHEN** a row contains an email value that is not a valid email address
- **THEN** the row SHALL be skipped
- **THEN** the error SHALL be recorded as `{row: <row_number>, message: "Ungültige E-Mail-Adresse."}`

#### Scenario: Duplicate person in file
- **WHEN** multiple rows in the file have the same first_name, last_name, and email combination
- **THEN** only the first occurrence SHALL be imported
- **THEN** subsequent duplicates SHALL be skipped with error `{row: <row_number>, message: "Doppelter Eintrag – Person wurde bereits importiert."}`

### Requirement: Person matching by email
The import logic SHALL match existing Person records by email to avoid duplicates.

#### Scenario: Existing person matched by email
- **WHEN** a row contains an email that matches an existing Person record belonging to the authenticated user
- **THEN** the existing Person record SHALL be used instead of creating a new one
- **THEN** the person SHALL be counted in the `skipped` count (not `created`)

#### Scenario: No email match creates new person
- **WHEN** a row contains an email that does not match any existing Person record
- **THEN** a new Person record SHALL be created with the data from the row
- **THEN** the person SHALL be counted in the `created` count

### Requirement: Upload dialog in frontend
A file upload dialog SHALL be accessible from the "Teilnehmende" tab for managers.

#### Scenario: Open import dialog
- **WHEN** a manager clicks "Teilnehmer importieren" in the "Teilnehmende" tab
- **THEN** an import dialog SHALL open with a file drop zone
- **THEN** the drop zone SHALL accept `.csv`, `.xlsx`, and `.xls` files
- **THEN** the drop zone label SHALL read "CSV- oder Excel-Datei hierher ziehen oder klicken"

#### Scenario: Non-managers cannot see import button
- **WHEN** a non-manager views the "Teilnehmende" tab
- **THEN** the "Teilnehmer importieren" button SHALL NOT be displayed

### Requirement: Column mapping UI
After file upload, a column mapping step SHALL allow the user to map file columns to Person/Participant fields.

#### Scenario: Column mapping display
- **WHEN** a user uploads a valid file
- **THEN** the dialog SHALL advance to the mapping step
- **THEN** a table SHALL display the detected column headers
- **THEN** each column SHALL have a dropdown to map it to one of: "Vorname", "Nachname", "E-Mail", "Pfadfindername", "Buchungsoption", or "– Ignorieren –"
- **THEN** the system SHALL auto-detect mappings based on common header names (e.g. "Vorname" → first_name, "Name" → last_name, "E-Mail" → email)

#### Scenario: Required mapping validation
- **WHEN** a user tries to proceed without mapping both "Vorname" and "Nachname"
- **THEN** a validation message "Vorname und Nachname müssen zugeordnet werden." SHALL be displayed
- **THEN** the user SHALL NOT be able to proceed to the preview step

### Requirement: Preview step before import
A preview step SHALL show the parsed data before committing the import.

#### Scenario: Preview display
- **WHEN** a user completes the column mapping and clicks "Vorschau"
- **THEN** the dialog SHALL advance to the preview step
- **THEN** a table SHALL display the first 10 mapped rows with the target field names as headers
- **THEN** the total number of rows SHALL be displayed: "{total} Einträge werden importiert"

#### Scenario: Cancel from preview
- **WHEN** a user clicks "Abbrechen" in the preview step
- **THEN** the dialog SHALL close without importing any data

#### Scenario: Confirm import from preview
- **WHEN** a user clicks "Importieren" in the preview step
- **THEN** the system SHALL call `POST /api/events/{slug}/import/` with the file and column mapping
- **THEN** a loading spinner SHALL be displayed during the import

### Requirement: Import result display
After import, the result SHALL be displayed to the user.

#### Scenario: Successful import result
- **WHEN** the import completes successfully
- **THEN** a result summary SHALL be displayed: "{created} Personen erstellt, {skipped} übersprungen"
- **THEN** if there are errors, an expandable error list SHALL show each failed row with its error message
- **THEN** a "Schließen" button SHALL close the dialog and refresh the participants list

#### Scenario: All rows failed
- **WHEN** the import completes but all rows had errors
- **THEN** the result SHALL display "Keine Einträge importiert." with the full error list
- **THEN** the dialog SHALL remain open for the user to review errors
