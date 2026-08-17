## MODIFIED Requirements

### Requirement: Event detail page with tab navigation
The system SHALL provide a unified event detail page at `/events/app/:slug` with role-based tab navigation for both members and managers.

#### Scenario: Navigate to event detail
- **WHEN** a user clicks on an event in the event list at `/events/app`
- **THEN** the browser SHALL navigate to `/events/app/{slug}`
- **THEN** the page SHALL load the event detail with role-appropriate tabs

#### Scenario: Tab navigation for members
- **WHEN** an invited (non-manager) user views the event detail page
- **THEN** the following tabs SHALL be available: Übersicht, Anmeldung, Teilnehmende, Einladung, Packliste
- **THEN** the active tab SHALL be reflected in the URL as a query parameter (e.g., `?tab=registration`)
- **THEN** switching tabs SHALL NOT reload the page

#### Scenario: Tab navigation for managers
- **WHEN** a manager views the event detail page
- **THEN** all member tabs PLUS the following admin tabs SHALL be available: Verwaltung, Eingeladene, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen
- **THEN** member tabs SHALL appear first, followed by admin tabs with a visual separator

### Requirement: Übersicht tab (Overview)
The Übersicht tab SHALL show a summary of the event with role-appropriate content.

#### Scenario: Overview content for members
- **WHEN** a member views the Übersicht tab
- **THEN** the page SHALL show:
  - Event name, dates, location as header
  - Phase timeline component (see event-phase-timeline spec)
  - Registration status card (registered/not registered with participant count)
  - Kontaktperson(en): Name and email of responsible_persons
  - Participant statistics (if `participant_visibility` allows)

#### Scenario: Overview content for managers
- **WHEN** a manager views the Übersicht tab
- **THEN** the page SHALL show all member content PLUS:
  - KPI cards: Teilnehmer (registered/capacity), Bezahlt (paid/total percentage), Einnahmen (received/expected)
  - Invitation status summary (accepted/pending counts)
  - Quick action buttons: Teilnehmer hinzufügen, E-Mail senden, Exportieren
  - Recent timeline entries (last 5)

### Requirement: Non-manager view
The page SHALL NOT show management tabs to non-manager users.

#### Scenario: Non-manager access
- **WHEN** a non-manager (but invited) user navigates to `/events/app/{slug}`
- **THEN** only member tabs SHALL be shown
- **THEN** the user SHALL see event info, their own registration status, and their participants

### Requirement: Einstellungen tab (Settings)
The Einstellungen tab SHALL allow managing event settings, custom fields, labels, and participant visibility.

#### Scenario: Settings content
- **WHEN** the manager views the Einstellungen tab
- **THEN** sections SHALL be shown for:
  - Event-Daten bearbeiten (name, description, dates, location, public toggle)
  - Teilnehmer-Sichtbarkeit (none/total_only/per_option/with_names)
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
