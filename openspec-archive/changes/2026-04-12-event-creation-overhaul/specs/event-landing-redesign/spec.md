## ADDED Requirements

### Requirement: Authenticated user dashboard layout
For authenticated users, the EventsPage SHALL display a dashboard-style layout with quick-action cards, event sections, recent activity, and statistics. The page SHALL NOT show the marketing landing page content.

#### Scenario: Authenticated user visits events page
- **WHEN** an authenticated user navigates to `/events`
- **THEN** the page SHALL display the dashboard layout with quick-action cards, "Meine Events", "Eingeladene Events", "Letzte Aktivitäten", and statistics sections

#### Scenario: Unauthenticated user visits events page
- **WHEN** an unauthenticated user navigates to `/events`
- **THEN** the page SHALL display the existing marketing landing page with event information and call-to-action for registration/login

### Requirement: Quick-action cards
The dashboard SHALL display prominent quick-action cards at the top: "Neues Event erstellen" (links to `/events/app/new`), "Meine Events" (scrolls to the Meine Events section), and "Eingeladene Events" (scrolls to the Eingeladene Events section). Each card SHALL have an icon and a short description.

#### Scenario: Click "Neues Event erstellen"
- **WHEN** the user clicks the "Neues Event erstellen" quick-action card
- **THEN** the user SHALL be navigated to `/events/app/new` (the event creation wizard)

#### Scenario: Click "Meine Events"
- **WHEN** the user clicks the "Meine Events" quick-action card
- **THEN** the page SHALL smooth-scroll to the "Meine Events" section

#### Scenario: Click "Eingeladene Events"
- **WHEN** the user clicks the "Eingeladene Events" quick-action card
- **THEN** the page SHALL smooth-scroll to the "Eingeladene Events" section

#### Scenario: Quick-action cards on mobile
- **WHEN** the dashboard is viewed on a mobile screen (< 640px)
- **THEN** the quick-action cards SHALL stack vertically in full width

### Requirement: Meine Events section with event cards
The "Meine Events" section SHALL display event cards for all events the authenticated user has created or is an organizer of. Each event card SHALL show the event name, color indicator, icon, date range, current phase, and participant count. Cards SHALL be ordered by start date (upcoming first).

#### Scenario: User with multiple events
- **WHEN** the user has created 5 events
- **THEN** the "Meine Events" section SHALL display 5 event cards ordered by start date with the nearest upcoming event first

#### Scenario: Event card displays visual identity
- **WHEN** an event has color `emerald` and icon `tent`
- **THEN** the event card SHALL display the tent icon and use emerald as the accent color on the card

#### Scenario: Event card shows phase badge
- **WHEN** an event is in the "registration" phase
- **THEN** the event card SHALL display a badge "Anmeldung offen" in the appropriate phase color

#### Scenario: User with no events
- **WHEN** the user has no events
- **THEN** the "Meine Events" section SHALL display an empty state with the message "Du hast noch keine Events erstellt." and a button "Erstes Event erstellen" linking to `/events/app/new`

#### Scenario: Click on event card
- **WHEN** the user clicks on an event card
- **THEN** the user SHALL be navigated to the event dashboard at `/events/app/{slug}`

### Requirement: Eingeladene Events section
The "Eingeladene Events" section SHALL display event cards for all events the user has been invited to. Cards SHALL show the event name, color, icon, date range, organizer name, and the user's registration status (eingeladen, angemeldet, abgelehnt).

#### Scenario: User with invited events
- **WHEN** the user has been invited to 3 events
- **THEN** the "Eingeladene Events" section SHALL display 3 event cards with the organizer's name and invitation status

#### Scenario: Invitation status display
- **WHEN** the user is invited but has not yet registered for an event
- **THEN** the event card SHALL show status "Eingeladen" with an "Anmelden" button

#### Scenario: No invited events
- **WHEN** the user has no event invitations
- **THEN** the "Eingeladene Events" section SHALL display "Keine Einladungen vorhanden."

### Requirement: Letzte Aktivitäten section
The "Letzte Aktivitäten" section SHALL display the 10 most recent activities across all of the user's events. Activities include new registrations, payment receipts, invitation responses, and event phase changes. Each entry SHALL show the activity description, event name, and timestamp.

#### Scenario: Recent activities displayed
- **WHEN** the user has events with recent activity
- **THEN** the section SHALL display up to 10 activity entries in reverse chronological order

#### Scenario: Activity entry format
- **WHEN** a participant "Max Müller" registered for event "Sommerlager 2026" 2 hours ago
- **THEN** the activity entry SHALL display: "Max Müller hat sich für Sommerlager 2026 angemeldet" with timestamp "vor 2 Stunden"

#### Scenario: No recent activities
- **WHEN** there are no recent activities across any events
- **THEN** the section SHALL display "Keine aktuellen Aktivitäten."

#### Scenario: Click on activity entry
- **WHEN** the user clicks on an activity entry
- **THEN** the user SHALL be navigated to the relevant event dashboard tab (e.g., participants tab for a registration activity)

### Requirement: Statistics overview
The dashboard SHALL display a statistics overview section showing: total events created, total participants across all events, and number of upcoming events. Statistics SHALL be displayed as prominent number cards.

#### Scenario: Statistics with data
- **WHEN** the user has 8 events, 124 total participants, and 3 upcoming events
- **THEN** the statistics section SHALL display three cards: "8 Events", "124 Teilnehmer", "3 anstehend"

#### Scenario: Statistics for new user
- **WHEN** the user has no events
- **THEN** the statistics section SHALL display "0 Events", "0 Teilnehmer", "0 anstehend"

### Requirement: Search and filter bar
The dashboard SHALL include a search and filter bar above the "Meine Events" section. The search input SHALL filter events by name. Filter options SHALL include: phase (Entwurf, Anmeldung offen, Laufend, Abgeschlossen), and date range. Filters SHALL apply to both "Meine Events" and "Eingeladene Events" sections simultaneously.

#### Scenario: Search events by name
- **WHEN** the user types "Sommer" in the search bar
- **THEN** both "Meine Events" and "Eingeladene Events" SHALL show only events whose name contains "Sommer"

#### Scenario: Filter by phase
- **WHEN** the user selects phase "Anmeldung offen"
- **THEN** only events in the registration phase SHALL be displayed in both sections

#### Scenario: Clear search and filters
- **WHEN** the user clears the search input and resets filters
- **THEN** all events SHALL be displayed again in both sections

#### Scenario: No results
- **WHEN** the search/filter combination yields no results
- **THEN** both sections SHALL display "Keine Events gefunden." with a suggestion to adjust the filters

### Requirement: Event template links
The dashboard SHALL include a section or link area referencing event templates. A prominent link "Event aus Vorlage erstellen" SHALL be available alongside the quick-action cards.

#### Scenario: Template link visibility
- **WHEN** the authenticated user views the dashboard
- **THEN** a link or card "Event aus Vorlage erstellen" SHALL be visible in the quick-action area

#### Scenario: Click on template link
- **WHEN** the user clicks "Event aus Vorlage erstellen"
- **THEN** the user SHALL be navigated to the event templates page

### Requirement: Mobile-first responsive layout
The events page SHALL be designed mobile-first with a minimum width of 320px. Quick-action cards SHALL stack vertically on mobile. Event cards SHALL be single-column on mobile and multi-column (2-3 cards per row) on desktop. The statistics section SHALL use a responsive grid.

#### Scenario: Layout on mobile (320px)
- **WHEN** the page is viewed on a 320px wide screen
- **THEN** quick-action cards SHALL stack vertically, event cards SHALL be full-width single column, and statistics cards SHALL be in a 1x3 vertical stack

#### Scenario: Layout on tablet (768px)
- **WHEN** the page is viewed on a 768px wide screen
- **THEN** event cards SHALL display in 2 columns and statistics cards SHALL be in a horizontal row

#### Scenario: Layout on desktop (1280px)
- **WHEN** the page is viewed on a 1280px wide screen
- **THEN** event cards SHALL display in 3 columns, quick-action cards in a horizontal row, and ample whitespace for readability

### Requirement: Navigational links throughout
The dashboard SHALL include contextual navigation links: event cards link to event dashboards, activity entries link to relevant tabs, quick-action cards link to creation/sections, and a persistent "Neues Event erstellen" floating action button on mobile.

#### Scenario: Floating action button on mobile
- **WHEN** the user scrolls down on a mobile device
- **THEN** a floating action button with a "+" icon and tooltip "Neues Event erstellen" SHALL remain visible in the bottom-right corner

#### Scenario: Floating action button on desktop
- **WHEN** the user views the dashboard on desktop
- **THEN** the floating action button SHALL NOT be displayed (the quick-action card is sufficient)
