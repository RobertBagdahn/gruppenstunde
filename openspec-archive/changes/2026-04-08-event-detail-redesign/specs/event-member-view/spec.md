## ADDED Requirements

### Requirement: Role-based tab navigation
The event detail page SHALL display tabs based on the user's role (member vs. manager).

#### Scenario: Member sees member tabs only
- **WHEN** an invited (non-manager) user views `/events/app/{slug}`
- **THEN** the following tabs SHALL be visible: Übersicht, Anmeldung, Teilnehmende, Einladung, Packliste
- **THEN** admin-only tabs (Verwaltung, Eingeladene, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen) SHALL NOT be visible

#### Scenario: Manager sees all tabs
- **WHEN** a manager (responsible person or staff) views `/events/app/{slug}`
- **THEN** all member tabs plus admin tabs SHALL be visible
- **THEN** tab order SHALL be: Übersicht, Anmeldung, Teilnehmende, Einladung, Packliste, Verwaltung, Eingeladene, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen

#### Scenario: Tab state in URL
- **WHEN** a user switches tabs
- **THEN** the URL SHALL update to include `?tab={tab-id}`
- **THEN** refreshing the page SHALL restore the selected tab
- **THEN** the default tab SHALL be `overview` when no tab parameter is present

### Requirement: Overview tab for members
The overview tab SHALL show the user's registration status, event summary, and phase timeline.

#### Scenario: Overview shows registration status
- **WHEN** a member views the overview tab
- **THEN** a prominent status card SHALL indicate whether the user is registered
- **THEN** if registered, the card SHALL show the number of registered persons and their booking options
- **THEN** a quick-action button SHALL link to the registration tab

#### Scenario: Overview shows event summary
- **WHEN** a member views the overview tab
- **THEN** the following information SHALL be displayed: Event name, description, dates (start/end), location, contact persons (responsible persons with email)
- **THEN** the phase timeline component SHALL be displayed

#### Scenario: Overview shows participant stats if enabled
- **WHEN** a member views the overview tab
- **AND** the event's `participant_visibility` is not `none`
- **THEN** participant statistics SHALL be displayed according to the visibility setting

### Requirement: Registration tab with re-registration support
The registration tab SHALL allow users to register, update their registration, or unregister.

#### Scenario: New registration
- **WHEN** a user who is not registered views the registration tab
- **AND** the event phase is `registration`
- **THEN** the registration form SHALL be displayed (person selection + booking option assignment)

#### Scenario: Update existing registration
- **WHEN** a user who is already registered views the registration tab
- **THEN** the tab SHALL show their current registration with all participants
- **THEN** for each participant, options to change booking option or remove the participant SHALL be available
- **THEN** an option to add additional persons to the registration SHALL be available

#### Scenario: Unregister
- **WHEN** a registered user wants to unregister
- **THEN** a "Abmelden" button SHALL be available
- **THEN** clicking it SHALL show a confirmation dialog
- **THEN** confirming SHALL remove all participants from the registration

#### Scenario: Registration outside registration phase
- **WHEN** the event phase is NOT `registration`
- **THEN** the registration form SHALL be disabled
- **THEN** a message SHALL explain why registration is not possible (e.g., "Die Anmeldephase hat noch nicht begonnen" or "Die Anmeldephase ist beendet")
- **THEN** if the user is already registered, their registration details SHALL still be visible

### Requirement: Participants tab with configurable visibility
The participants tab SHALL show registration numbers based on the event's `participant_visibility` setting.

#### Scenario: Visibility set to none
- **WHEN** `participant_visibility` is `none`
- **AND** the user is a member (not manager)
- **THEN** a message SHALL state "Die Teilnehmerliste ist nicht freigegeben."

#### Scenario: Visibility set to total_only
- **WHEN** `participant_visibility` is `total_only`
- **THEN** the tab SHALL show the total number of registered participants

#### Scenario: Visibility set to per_option
- **WHEN** `participant_visibility` is `per_option`
- **THEN** the tab SHALL show the number of participants per booking option
- **THEN** each booking option SHALL display: name, count, max_participants (if set), fill level

#### Scenario: Visibility set to with_names
- **WHEN** `participant_visibility` is `with_names`
- **THEN** the tab SHALL show participant first names grouped by booking option
- **THEN** last names SHALL NOT be shown (privacy)

### Requirement: Invitation text tab
The invitation text tab SHALL display the event's invitation text.

#### Scenario: Member views invitation text
- **WHEN** a member views the invitation tab
- **THEN** the invitation text SHALL be rendered as Markdown (using MarkdownRenderer)
- **THEN** the text SHALL be read-only

#### Scenario: Manager edits invitation text
- **WHEN** a manager views the invitation tab
- **THEN** an "Bearbeiten" button SHALL be available
- **THEN** clicking it SHALL switch to a MarkdownEditor
- **THEN** saving SHALL update the event's `invitation_text` via PATCH `/api/events/{slug}/`

#### Scenario: No invitation text set
- **WHEN** the event has no invitation text
- **AND** the user is a member
- **THEN** a message SHALL state "Es wurde noch kein Einladungstext hinterlegt."

### Requirement: Packing list tab
The packing list tab SHALL display the event's linked packing list.

#### Scenario: Member views packing list
- **WHEN** a member views the packing list tab
- **AND** the event has a linked `packing_list`
- **THEN** the packing list SHALL be displayed with categories and items (read-only)

#### Scenario: Manager edits packing list
- **WHEN** a manager views the packing list tab
- **THEN** an "Bearbeiten" button SHALL be available
- **THEN** the manager SHALL be able to edit the packing list inline or navigate to the packing list editor

#### Scenario: No packing list linked
- **WHEN** the event has no linked packing list
- **AND** the user is a manager
- **THEN** an option to create or link a packing list SHALL be displayed
- **WHEN** the user is a member
- **THEN** a message SHALL state "Es wurde noch keine Packliste hinterlegt."

### Requirement: Configurable participant visibility setting
The event settings SHALL allow managers to configure participant visibility.

#### Scenario: Visibility setting in event settings
- **WHEN** a manager views the event settings tab
- **THEN** a "Teilnehmer-Sichtbarkeit" section SHALL be displayed
- **THEN** the following options SHALL be available:
  - "Nicht sichtbar" (`none`)
  - "Nur Gesamtzahl" (`total_only`)
  - "Zahlen pro Buchungsoption" (`per_option`)
  - "Zahlen und Vornamen" (`with_names`)
- **THEN** changing the setting SHALL update the event via PATCH `/api/events/{slug}/`
