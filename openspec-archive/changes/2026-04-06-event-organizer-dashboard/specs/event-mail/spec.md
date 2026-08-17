## ADDED Requirements

### Requirement: Send manual mail to participants
The system SHALL allow event managers to send manual emails to selected participants.

#### Scenario: Send mail to all participants
- **WHEN** POST `/api/events/{slug}/send-mail/` with `{subject: "Info zum Sommerlager", body: "Hallo {vorname}, ...", recipient_type: "all"}`
- **THEN** the system SHALL send an email to all participants of the event
- **THEN** the system SHALL replace placeholders with participant-specific values
- **THEN** the response SHALL include the number of successfully sent mails

#### Scenario: Send mail to filtered participants
- **WHEN** POST `/api/events/{slug}/send-mail/` with `{subject: "...", body: "...", recipient_type: "filtered", filters: {is_paid: false}}`
- **THEN** the system SHALL send the email only to unpaid participants

#### Scenario: Send mail to specific participants
- **WHEN** POST `/api/events/{slug}/send-mail/` with `{subject: "...", body: "...", recipient_type: "selected", participant_ids: [1, 2, 3]}`
- **THEN** the system SHALL send the email only to the specified participants

### Requirement: Mail placeholders
The system SHALL support the following placeholders in mail body and subject: `{vorname}`, `{nachname}`, `{pfadiname}`, `{event_name}`, `{buchungsoption}`, `{preis}`, `{bezahlt}`, `{restbetrag}`.

#### Scenario: Placeholder replacement
- **WHEN** a mail is sent with body "Hallo {vorname}, du bist für {event_name} angemeldet."
- **THEN** each recipient SHALL receive the mail with their first name and the event name inserted

#### Scenario: Missing data placeholder
- **WHEN** a placeholder refers to empty data (e.g., participant has no scout_name)
- **THEN** the placeholder SHALL be replaced with an empty string

### Requirement: Mail requires manager permission
Only event managers SHALL be able to send mails.

#### Scenario: Non-manager mail attempt
- **WHEN** a non-manager user requests POST `/api/events/{slug}/send-mail/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Mail creates timeline entries
Each sent mail SHALL be logged in the event timeline.

#### Scenario: Timeline entry for sent mail
- **WHEN** a mail is successfully sent to a participant
- **THEN** a TimelineEntry with action_type `mail_sent` SHALL be created
- **THEN** the metadata SHALL include the mail subject

### Requirement: Mail result reporting
The API response SHALL report the outcome of the mail sending.

#### Scenario: Successful mail result
- **WHEN** all mails are sent successfully
- **THEN** the response SHALL include `{sent_count: N, failed_count: 0, failed_recipients: []}`

#### Scenario: Partially failed mail result
- **WHEN** some mails fail to send
- **THEN** the response SHALL include `{sent_count: N, failed_count: M, failed_recipients: [{participant_id, email, error}]}`

### Requirement: Mail composer frontend
The frontend SHALL provide a mail composer with recipient selection, placeholder insertion, and preview.

#### Scenario: Mail composer UI
- **WHEN** the manager opens the E-Mails tab in the event dashboard
- **THEN** a form SHALL be shown with: subject input, body textarea, recipient type selector (Alle/Gefiltert/Ausgewählt)
- **THEN** a sidebar or toolbar SHALL show available placeholders that can be clicked to insert
- **THEN** a "Vorschau" button SHALL show the mail with placeholders replaced for a sample participant
- **THEN** a "Senden" button SHALL send the mail after confirmation dialog

### Requirement: Mail sent from event responsible person
Mails SHALL be sent with the reply-to address of the first responsible person of the event.

#### Scenario: Reply-to header
- **WHEN** a mail is sent for an event with responsible_persons
- **THEN** the mail SHALL include a Reply-To header with the first responsible person's email
- **THEN** the From address SHALL be the system's configured email address (e.g., noreply@gruppenstunde.de)
