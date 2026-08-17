## ADDED Requirements

### Requirement: Custom Field definition model
The system SHALL store custom field definitions per event as a `CustomField` model with: event (FK), label (CharField — the question text), field_type (CharField choices: text, select, checkbox, date, number), options (JSONField — list of strings for select fields, null otherwise), is_required (BooleanField), sort_order (IntegerField), created_at (auto timestamp).

#### Scenario: Create a text custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Kann dein Kind schwimmen?", field_type: "text", is_required: false}`
- **THEN** a CustomField record SHALL be created for the event

#### Scenario: Create a select custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "T-Shirt Größe", field_type: "select", options: ["S", "M", "L", "XL"], is_required: true}`
- **THEN** a CustomField record SHALL be created with the options stored as JSON array

#### Scenario: Create a checkbox custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Einverständnis Fotos", field_type: "checkbox", is_required: true}`
- **THEN** a CustomField record SHALL be created

#### Scenario: Create a date custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Letzter Tetanus-Impfung", field_type: "date", is_required: false}`
- **THEN** a CustomField record SHALL be created

#### Scenario: Create a number custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Schuhgröße", field_type: "number", is_required: false}`
- **THEN** a CustomField record SHALL be created

### Requirement: Custom Field CRUD API
The system SHALL provide CRUD endpoints for custom field definitions.

#### Scenario: List custom fields for an event
- **WHEN** GET `/api/events/{slug}/custom-fields/`
- **THEN** the system SHALL return all custom fields for the event, ordered by sort_order

#### Scenario: Update a custom field
- **WHEN** PATCH `/api/events/{slug}/custom-fields/{id}/` with `{label: "Updated question"}`
- **THEN** the custom field SHALL be updated

#### Scenario: Delete a custom field
- **WHEN** DELETE `/api/events/{slug}/custom-fields/{id}/`
- **THEN** the custom field and all associated values SHALL be deleted (CASCADE)

#### Scenario: Custom fields require manager permission
- **WHEN** a non-manager user attempts to create/update/delete custom fields
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Custom Field Value storage
The system SHALL store participant answers as `CustomFieldValue` model with: custom_field (FK), participant (FK), value (TextField).

#### Scenario: Set custom field values for a participant
- **WHEN** PATCH `/api/events/{slug}/participants/{id}/custom-fields/` with `{values: [{custom_field_id: 1, value: "Ja"}, {custom_field_id: 2, value: "M"}]}`
- **THEN** CustomFieldValue records SHALL be created or updated for each field
- **THEN** for checkbox fields, "true"/"false" strings SHALL be used

#### Scenario: Validate required custom fields
- **WHEN** a required custom field has no value set for a participant
- **THEN** the system SHALL NOT enforce this at the API level (manager can fill in later)

#### Scenario: Validate select field value
- **WHEN** a value is set for a select custom field
- **THEN** the system SHALL validate that the value is one of the defined options

### Requirement: Custom fields in registration flow
Custom fields SHALL be visible during participant registration so values can be filled in.

#### Scenario: Custom fields shown in registration form
- **WHEN** the registration form is displayed for an event with custom fields
- **THEN** each custom field SHALL be rendered as the appropriate input type (text input, dropdown, checkbox, date picker, number input)
- **THEN** required fields SHALL be marked with an asterisk (*)

### Requirement: Custom fields in participant detail
Custom field values SHALL be displayed in the participant detail view and be editable by managers.

#### Scenario: View custom field values
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include a `custom_field_values` array with {custom_field_id, label, field_type, value}

### Requirement: Custom fields in exports
Custom field values SHALL be available as export columns.

#### Scenario: Export with custom fields
- **WHEN** POST `/api/events/{slug}/export/` with columns including a custom field id
- **THEN** the export SHALL include a column with the custom field label as header and participant values as rows
