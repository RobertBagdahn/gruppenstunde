## MODIFIED Requirements

### Requirement: Event detail page with tab navigation
The system SHALL provide a unified event detail page at `/events/app/:slug` with role-based tab navigation. Manager tabs SHALL be consolidated from 7 admin tabs to 5 admin tabs.

#### Scenario: Navigate to event detail
- **WHEN** a user clicks on an event in the event list at `/events/app`
- **THEN** the browser SHALL navigate to `/events/app/{slug}`
- **THEN** the page SHALL load the event detail with role-appropriate tabs

#### Scenario: Tab navigation for members
- **WHEN** an invited (non-manager) user views the event detail page
- **THEN** the following tabs SHALL be available: Übersicht, Teilnehmende, Einladung & Gäste, Packliste
- **THEN** the active tab SHALL be reflected in the URL as a query parameter (e.g., `?tab=overview`)
- **THEN** switching tabs SHALL NOT reload the page

#### Scenario: Tab navigation for managers
- **WHEN** a manager views the event detail page
- **THEN** all member tabs PLUS the following admin tabs SHALL be available: Teilnehmende (with admin toggle), Einladung & Gäste, Zahlungen, Aktivität, Einstellungen
- **THEN** member tabs SHALL appear first, followed by admin tabs with a visual separator
- **THEN** the former "Verwaltung", "Eingeladene", "Timeline", "E-Mails", and "Exporte" tabs SHALL NOT appear as separate tabs

### Requirement: Teilnehmende tab with admin toggle
The Teilnehmende tab SHALL provide a role-based toggle between member view and admin view for managers.

#### Scenario: Member view of participants
- **WHEN** a non-manager views the Teilnehmende tab
- **THEN** participants SHALL be displayed according to the `participant_visibility` setting
- **THEN** no admin controls SHALL be visible

#### Scenario: Admin toggle for managers
- **WHEN** a manager views the Teilnehmende tab
- **THEN** a toggle SHALL be available to switch between "Mitglied-Ansicht" and "Admin-Ansicht"
- **THEN** "Admin-Ansicht" SHALL be the default for managers
- **THEN** the toggle state SHALL be reflected in the URL (e.g., `?tab=participants&view=admin`)

#### Scenario: Admin view filter capabilities
- **WHEN** a manager views the Teilnehmende tab in "Admin-Ansicht"
- **THEN** filter controls SHALL be available for:
  - Buchungsoption: dropdown with all booking options (filter parameter: `?booking-option={id}`)
  - Zahlungsstatus: dropdown with options "Bezahlt", "Nicht bezahlt", "Teilweise bezahlt" (filter parameter: `?payment-status=paid|unpaid|partial`)
  - Label: dropdown with all event labels (filter parameter: `?label={id}`)
  - Suche: text input searching first_name, last_name, scout_name, email (filter parameter: `?search={query}`)
- **THEN** all filters SHALL be combinable (AND logic)
- **THEN** active filters SHALL be reflected in URL query parameters

#### Scenario: Filter persistence via URL
- **WHEN** the URL contains `?tab=participants&booking-option=1&payment-status=paid`
- **THEN** the page SHALL restore the filters from URL parameters on load
- **THEN** changing a filter SHALL update the URL without page reload

### Requirement: Einladung & Gäste tab consolidated
The Einladung & Gäste tab SHALL combine the former "Einladung" (member) and "Eingeladene" (manager) tabs into a single view with role-appropriate content.

#### Scenario: Member view of invitations
- **WHEN** a non-manager views the Einladung & Gäste tab
- **THEN** the user SHALL see their own invitation status
- **THEN** the user SHALL see the list of invited persons (if `participant_visibility` allows)

#### Scenario: Manager view of invitations
- **WHEN** a manager views the Einladung & Gäste tab
- **THEN** the full invitation list SHALL be displayed with status (accepted, pending, declined)
- **THEN** controls to invite new users and manage existing invitations SHALL be available
- **THEN** guest registration settings SHALL be accessible

### Requirement: Zahlungen tab with filters
The Zahlungen tab SHALL include filter capabilities for managers.

#### Scenario: Payment list with filters
- **WHEN** a manager views the Zahlungen tab
- **THEN** filter controls SHALL be available for:
  - Zahlungsmethode: dropdown with available payment methods (filter parameter: `?method={value}`)
  - Zeitraum: date range picker for start and end date (filter parameters: `?date-from={date}&date-to={date}`)
- **THEN** all filters SHALL be combinable (AND logic)
- **THEN** active filters SHALL be reflected in URL query parameters

#### Scenario: Payment filters in URL
- **WHEN** the URL contains `?tab=payments&method=transfer&date-from=2026-01-01&date-to=2026-03-31`
- **THEN** the page SHALL restore the filters from URL parameters on load
- **THEN** the payment list SHALL show only payments matching the filter criteria

### Requirement: Aktivität tab consolidates timeline, emails, and exports
The Aktivität tab SHALL combine the former "Timeline", "E-Mails", and "Exporte" tabs into a single activity stream with filter capabilities.

#### Scenario: Activity stream content
- **WHEN** a manager views the Aktivität tab
- **THEN** the tab SHALL display a unified activity stream containing:
  - Timeline entries (participant changes, status updates, etc.)
  - Sent emails (with recipient count and subject)
  - Export actions (with export type and timestamp)
- **THEN** entries SHALL be sorted by date, newest first

#### Scenario: Activity stream filters
- **WHEN** a manager views the Aktivität tab
- **THEN** filter controls SHALL be available for:
  - Aktionstyp: dropdown with action types such as "Teilnehmer-Änderung", "E-Mail", "Export", "Zahlung", "Statusänderung" (filter parameter: `?action-type={value}`)
  - Zeitraum: date range picker for start and end date (filter parameters: `?date-from={date}&date-to={date}`)
- **THEN** all filters SHALL be combinable (AND logic)
- **THEN** active filters SHALL be reflected in URL query parameters

#### Scenario: Activity filters in URL
- **WHEN** the URL contains `?tab=activity&action-type=email&date-from=2026-03-01`
- **THEN** the page SHALL restore the filters from URL parameters on load
- **THEN** the activity stream SHALL show only entries matching the filter criteria

### Requirement: Übersicht tab (Overview)
The Übersicht tab SHALL show a summary of the event with role-appropriate content.

#### Scenario: Overview content for members
- **WHEN** a member views the Übersicht tab
- **THEN** the page SHALL show:
  - Event name, dates, location as header
  - Phase timeline component (see event-phase-timeline spec)
  - Phase guidance banner with action instructions (see event-member-view spec)
  - Registration status card with inline registration form (registered/not registered with participant count)
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
- **THEN** only member tabs SHALL be shown: Übersicht, Teilnehmende, Einladung & Gäste, Packliste
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

#### Scenario: Mobile filter controls
- **WHEN** filters are used on a mobile device
- **THEN** filters SHALL be accessible via a "Filter" button that opens a bottom sheet or collapsible panel
- **THEN** active filter count SHALL be shown on the "Filter" button (e.g., "Filter (2)")

### Requirement: URL-driven tab and filter state
The active tab and all filter states SHALL be reflected in the URL.

#### Scenario: Tab state in URL
- **WHEN** the manager switches to the Zahlungen tab
- **THEN** the URL SHALL update to `/events/app/{slug}?tab=payments`
- **THEN** refreshing the page SHALL restore the Zahlungen tab

#### Scenario: Default tab
- **WHEN** the URL has no tab parameter
- **THEN** the Übersicht tab SHALL be shown by default

#### Scenario: Combined tab and filter state in URL
- **WHEN** the manager is on the Teilnehmende tab with filters applied
- **THEN** the URL SHALL be e.g., `/events/app/{slug}?tab=participants&booking-option=1&payment-status=paid&search=Max`
- **THEN** refreshing the page SHALL restore both the tab and all active filters
- **THEN** sharing the URL SHALL allow another manager to see the same filtered view
