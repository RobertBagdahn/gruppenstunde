## ADDED Requirements

### Requirement: Participant Label model
The system SHALL store labels per event as a `ParticipantLabel` model with: event (FK), name (CharField, max 50), color (CharField, max 7 — hex color code e.g. "#FF5733"), created_at (auto timestamp). Participants SHALL have a M2M relation to ParticipantLabel.

#### Scenario: Create a label
- **WHEN** POST `/api/events/{slug}/labels/` with `{name: "Zelt A", color: "#4CAF50"}`
- **THEN** a ParticipantLabel record SHALL be created for the event

#### Scenario: Labels are event-scoped
- **WHEN** labels are created for event A
- **THEN** they SHALL NOT be visible in event B

### Requirement: Label CRUD API
The system SHALL provide CRUD endpoints for labels.

#### Scenario: List labels for an event
- **WHEN** GET `/api/events/{slug}/labels/`
- **THEN** the system SHALL return all labels for the event, ordered by name

#### Scenario: Update a label
- **WHEN** PATCH `/api/events/{slug}/labels/{id}/` with `{name: "Zelt B", color: "#2196F3"}`
- **THEN** the label SHALL be updated

#### Scenario: Delete a label
- **WHEN** DELETE `/api/events/{slug}/labels/{id}/`
- **THEN** the label SHALL be deleted and removed from all participants

#### Scenario: Labels require manager permission
- **WHEN** a non-manager user attempts to create/update/delete labels
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Assign labels to participants
The system SHALL allow managers to assign and remove labels from participants.

#### Scenario: Assign a label to a participant
- **WHEN** POST `/api/events/{slug}/participants/{id}/labels/` with `{label_id: 3}`
- **THEN** the label SHALL be added to the participant's labels M2M relation
- **THEN** a TimelineEntry with action_type `label_added` SHALL be created

#### Scenario: Remove a label from a participant
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/labels/{label_id}/`
- **THEN** the label SHALL be removed from the participant's labels
- **THEN** a TimelineEntry with action_type `label_removed` SHALL be created

#### Scenario: Assign already assigned label
- **WHEN** POST `/api/events/{slug}/participants/{id}/labels/` with a label_id that is already assigned
- **THEN** the system SHALL return 200 (idempotent, no duplicate)

### Requirement: Labels in participant list
The participant list SHALL include label information.

#### Scenario: Participant response includes labels
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include a `labels` array with {id, name, color}

### Requirement: Filter participants by label
The participant list SHALL be filterable by label.

#### Scenario: Filter by label
- **WHEN** GET `/api/events/{slug}/participants/?label-id=3`
- **THEN** the system SHALL return only participants that have the specified label

### Requirement: Labels in frontend
The frontend SHALL display labels as colored badges on participants and provide a label management UI.

#### Scenario: Label badges in participant list
- **WHEN** the manager views the Teilnehmer tab
- **THEN** each participant row SHALL show their assigned labels as small colored badges

#### Scenario: Quick label assignment
- **WHEN** the manager clicks on a participant's label area
- **THEN** a dropdown SHALL appear showing all available labels with checkboxes
- **THEN** toggling a checkbox SHALL immediately assign/remove the label

#### Scenario: Label management in settings
- **WHEN** the manager views the Einstellungen tab
- **THEN** a label management section SHALL allow creating, editing (name + color), and deleting labels
