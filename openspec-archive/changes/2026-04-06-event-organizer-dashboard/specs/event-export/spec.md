## ADDED Requirements

### Requirement: Export configuration
The system SHALL allow managers to configure which columns to include in an export and which format to use.

#### Scenario: Export with column selection
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: ["first_name", "last_name", "email", "booking_option", "is_paid"]}`
- **THEN** the system SHALL return a file containing only the selected columns

#### Scenario: Export all available columns
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "csv", columns: ["all"]}`
- **THEN** the system SHALL include all standard columns plus custom field values and labels

### Requirement: Export formats
The system SHALL support three export formats: Excel (.xlsx), CSV (.csv), and PDF (.pdf).

#### Scenario: Excel export
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...]}`
- **THEN** the response SHALL be an .xlsx file with Content-Disposition header
- **THEN** the first row SHALL contain column headers in German

#### Scenario: CSV export
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "csv", columns: [...]}`
- **THEN** the response SHALL be a .csv file with UTF-8-BOM encoding (for Excel compatibility)
- **THEN** the delimiter SHALL be semicolon (;) for German locale compatibility

#### Scenario: PDF export (checklist)
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "pdf", columns: [...]}`
- **THEN** the response SHALL be a .pdf file formatted as a printable checklist
- **THEN** each row SHALL have a checkbox column for manual checking

### Requirement: Available export columns
The system SHALL support the following columns for export: `first_name`, `last_name`, `scout_name`, `email`, `birthday`, `age` (computed), `gender`, `address`, `zip_code`, `city`, `booking_option`, `is_paid`, `total_paid`, `remaining_amount`, `payment_method` (method of the most recent payment by received_at), `nutritional_tags`, `labels`, and all custom field values (dynamically).

#### Scenario: Available columns endpoint
- **WHEN** GET `/api/events/{slug}/export/columns/`
- **THEN** the system SHALL return a list of available columns with id, label (German), and type (standard/custom_field/computed)

### Requirement: Export with filters
The system SHALL allow applying participant filters to the export.

#### Scenario: Export only paid participants
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {is_paid: true}}`
- **THEN** the export SHALL only contain participants where is_paid is true

#### Scenario: Export by booking option
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {booking_option_id: 5}}`
- **THEN** the export SHALL only contain participants with that booking option

#### Scenario: Export by label
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {label_id: 3}}`
- **THEN** the export SHALL only contain participants with that label

### Requirement: Export requires manager permission
Only event managers SHALL be able to export participant data.

#### Scenario: Non-manager export attempt
- **WHEN** a non-manager user requests POST `/api/events/{slug}/export/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Export frontend dialog
The frontend SHALL provide an export dialog with column selection, format choice, and filter options.

#### Scenario: Export dialog UI
- **WHEN** the manager clicks "Exportieren" in the Exporte tab
- **THEN** a dialog SHALL appear with checkboxes for each available column
- **THEN** a format selector (Excel/CSV/PDF) SHALL be shown
- **THEN** optional filter dropdowns (Bezahlt, Buchungsoption, Label) SHALL be available
- **THEN** a "Herunterladen" button SHALL trigger the download
