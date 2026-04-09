## ADDED Requirements

### Requirement: Compact event card design
The event list page SHALL display events in compact, information-dense cards.

#### Scenario: Event card content
- **WHEN** the event list is displayed at `/events/app`
- **THEN** each event card SHALL show:
  - Event name (bold, primary text)
  - Phase badge (color-coded, e.g., green for "Anmeldephase", blue for "Vor dem Event")
  - Date range (formatted as "DD.MM. – DD.MM.YYYY" or "DD.MM.YYYY" for single-day events)
  - Location (city or location name, truncated if needed)
  - Registration status icon (checkmark if registered, empty circle if not)
- **THEN** each card SHALL link to `/events/app/{slug}`

#### Scenario: Event card phase badges
- **WHEN** a phase badge is displayed
- **THEN** the following color scheme SHALL be used:
  - `draft`: gray badge
  - `pre_registration`: yellow badge
  - `registration`: green badge
  - `pre_event`: blue badge
  - `running`: purple badge
  - `completed`: muted/gray badge

### Requirement: Full-width event list layout
The event list SHALL use full width without a sidebar detail panel.

#### Scenario: List layout on desktop
- **WHEN** the event list is viewed on desktop (>= 768px)
- **THEN** events SHALL be displayed in a responsive grid (2-3 columns)
- **THEN** the "Neues Event" button SHALL be displayed prominently at the top

#### Scenario: List layout on mobile
- **WHEN** the event list is viewed on mobile (< 768px)
- **THEN** events SHALL be displayed in a single column
- **THEN** cards SHALL use full width with minimal padding

### Requirement: Remove sidebar detail panel
The inline detail panel in the event list page SHALL be removed.

#### Scenario: Event click navigates to detail page
- **WHEN** a user clicks an event card on the list page
- **THEN** the browser SHALL navigate to `/events/app/{slug}`
- **THEN** no inline detail panel SHALL be shown on the list page

### Requirement: User registration status in event list
The event list API SHALL include the user's registration status for each event.

#### Scenario: Registration status in list response
- **WHEN** GET `/api/events/` by an authenticated user
- **THEN** each event in the response SHALL include `is_registered: boolean`
- **WHEN** the user is not authenticated
- **THEN** `is_registered` SHALL be `false` for all events
