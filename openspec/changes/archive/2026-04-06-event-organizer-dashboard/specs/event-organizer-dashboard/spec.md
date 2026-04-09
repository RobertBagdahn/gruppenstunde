## ADDED Requirements

### Requirement: Event detail page with tab navigation
The system SHALL provide a dedicated event detail page at `/events/app/:slug` with tab-based navigation for all management features.

#### Scenario: Navigate to event detail
- **WHEN** a manager clicks on an event in the event list at `/events/app`
- **THEN** the browser SHALL navigate to `/events/app/{slug}`
- **THEN** the page SHALL load the event detail with tabs

#### Scenario: Tab navigation
- **WHEN** the event detail page loads
- **THEN** the following tabs SHALL be available: Übersicht, Teilnehmer, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen
- **THEN** the active tab SHALL be reflected in the URL as a query parameter (e.g., `?tab=participants`)
- **THEN** switching tabs SHALL NOT reload the page

### Requirement: Übersicht tab (Overview)
The Übersicht tab SHALL show a summary of the event with KPIs and quick actions.

#### Scenario: Overview content
- **WHEN** the manager views the Übersicht tab
- **THEN** the page SHALL show:
  - Event name, dates, location as header
  - Kontaktperson(en): Name and email of responsible_persons
  - KPI cards: Teilnehmer (registered/capacity), Bezahlt (paid/total percentage), Einnahmen (received/expected)
  - Quick action buttons: Teilnehmer hinzufügen, E-Mail senden, Exportieren
  - Recent timeline entries (last 5)
  - Registration chart (mini line chart)

#### Scenario: Non-manager view
- **WHEN** a non-manager (but invited) user navigates to `/events/app/{slug}`
- **THEN** the page SHALL show a simplified view without management tabs
- **THEN** the user SHALL see event info, their own registration status, and their participants

### Requirement: Teilnehmer tab (Participants)
The Teilnehmer tab SHALL show a filterable, searchable participant list with label badges and payment status.

#### Scenario: Participant list
- **WHEN** the manager views the Teilnehmer tab
- **THEN** a table/list SHALL show all participants with: Name, Buchungsoption, Bezahlt-Status (icon), Labels (colored badges), Aktionen (edit, remove)
- **THEN** the list SHALL be searchable by name
- **THEN** the list SHALL be filterable by: Buchungsoption, Bezahlt, Label

#### Scenario: Participant detail expansion
- **WHEN** the manager clicks on a participant row
- **THEN** an expandable detail section SHALL show: all person data, custom field values, payment history, contact info

#### Scenario: Inline participant editing
- **WHEN** the manager clicks "Bearbeiten" on a participant
- **THEN** an inline form or dialog SHALL allow editing: booking option, personal data, custom field values, labels

### Requirement: Zahlungen tab (Payments)
The Zahlungen tab SHALL show all payments and allow recording new ones.

#### Scenario: Payment list view
- **WHEN** the manager views the Zahlungen tab
- **THEN** a list SHALL show all payments with: Teilnehmer (name), Betrag, Methode (icon + text), Erhalten am, Ort, Erstellt von
- **THEN** a summary SHALL show: Gesamteinnahmen, Ausstehend, Bezahlt-Quote

#### Scenario: Record new payment
- **WHEN** the manager clicks "Zahlung erfassen"
- **THEN** a form/dialog SHALL appear with: Teilnehmer (searchable dropdown), Betrag (pre-filled with remaining amount), Methode (Bar/PayPal/Überweisung/Sonstige), Erhalten am (date+time, default now), Ort (optional text), Bemerkung (optional text)
- **THEN** submitting SHALL create the payment and update the participant's payment status

### Requirement: E-Mails tab
The E-Mails tab SHALL provide the mail composer interface.

#### Scenario: Mail composer access
- **WHEN** the manager views the E-Mails tab
- **THEN** the mail composer SHALL be shown (as defined in event-mail spec)

### Requirement: Exporte tab
The Exporte tab SHALL provide the export configuration interface.

#### Scenario: Export access
- **WHEN** the manager views the Exporte tab
- **THEN** the export dialog SHALL be shown (as defined in event-export spec)

### Requirement: Einstellungen tab (Settings)
The Einstellungen tab SHALL allow managing event settings, custom fields, and labels.

#### Scenario: Settings content
- **WHEN** the manager views the Einstellungen tab
- **THEN** sections SHALL be shown for:
  - Event-Daten bearbeiten (name, description, dates, location, public toggle)
  - Custom Fields verwalten (create, edit, reorder, delete)
  - Labels verwalten (create, edit colors, delete)
  - Buchungsoptionen verwalten (create, edit, delete)
  - Gefahrenzone (Event löschen)

### Requirement: Mobile-responsive dashboard
The dashboard SHALL work well on mobile devices (320px minimum).

#### Scenario: Mobile tab navigation
- **WHEN** the dashboard is viewed on a mobile device
- **THEN** tabs SHALL be displayed as a horizontally scrollable tab bar
- **THEN** tab content SHALL use full width
- **THEN** participant list SHALL use a card layout instead of table

### Requirement: URL-driven tab state
The active tab SHALL be reflected in the URL.

#### Scenario: Tab state in URL
- **WHEN** the manager switches to the Zahlungen tab
- **THEN** the URL SHALL update to `/events/app/{slug}?tab=payments`
- **THEN** refreshing the page SHALL restore the Zahlungen tab

#### Scenario: Default tab
- **WHEN** the URL has no tab parameter
- **THEN** the Übersicht tab SHALL be shown by default
