## ADDED Requirements

### Requirement: Consolidated tab structure from 12 to 7 tabs
The event organizer dashboard SHALL consolidate from 12 tabs to 7 tabs. The new tab structure SHALL be: "Übersicht" (merged from Übersicht + Anmeldung), "Teilnehmende" (merged from Teilnehmende + Verwaltung), "Einladung & Gäste" (merged from Einladung + Eingeladene), "Packliste" (unchanged), "Zahlungen" (unchanged, with filters), "Aktivität" (merged from Timeline + E-Mails + Exporte), and "Einstellungen" (unchanged).

#### Scenario: Dashboard displays 7 tabs
- **WHEN** an event organizer opens the event dashboard
- **THEN** the tab bar SHALL display exactly 7 tabs: "Übersicht", "Teilnehmende", "Einladung & Gäste", "Packliste", "Zahlungen", "Aktivität", "Einstellungen"

#### Scenario: Default tab on dashboard open
- **WHEN** an organizer navigates to the event dashboard without a `?tab=` parameter
- **THEN** the "Übersicht" tab SHALL be active by default

### Requirement: Übersicht tab combines overview and registration info
The "Übersicht" tab SHALL display the event overview information (name, dates, phase, locations) combined with registration statistics and status. Registration data previously shown in a separate "Anmeldung" tab SHALL be integrated into summary cards within this tab.

#### Scenario: Übersicht shows registration summary
- **WHEN** the organizer views the "Übersicht" tab for an event with 15 of 30 spots filled
- **THEN** the tab SHALL display the event details AND a registration summary card showing "15 / 30 Plätze belegt" with a progress bar

#### Scenario: Übersicht shows event phase info
- **WHEN** the organizer views the "Übersicht" tab
- **THEN** the tab SHALL display the current event phase with contextual explanation and action buttons

### Requirement: Teilnehmende tab with role toggle
The "Teilnehmende" tab SHALL combine the former "Teilnehmende" and "Verwaltung" tabs. It SHALL include a role toggle allowing the organizer to switch between the member view (what participants see) and the admin view (management tools, bulk actions, label assignment).

#### Scenario: Admin view of participants
- **WHEN** the organizer is on the "Teilnehmende" tab with admin view active
- **THEN** the tab SHALL display the full participant list with management actions: assign labels, change booking options, edit custom field values, remove participants, and bulk actions

#### Scenario: Member view toggle
- **WHEN** the organizer clicks the "Teilnehmer-Ansicht" toggle
- **THEN** the tab SHALL switch to show what a regular participant would see: the participant list without management actions

#### Scenario: Toggle back to admin view
- **WHEN** the organizer clicks "Admin-Ansicht" after viewing the member view
- **THEN** the tab SHALL switch back to the full management view

### Requirement: Einladung & Gäste combined tab
The "Einladung & Gäste" tab SHALL combine the former "Einladung" and "Eingeladene" tabs. It SHALL show invitation management (send invitations, generate links) and the list of invited/pending persons in a single view.

#### Scenario: View invited persons
- **WHEN** the organizer opens the "Einladung & Gäste" tab
- **THEN** the tab SHALL display the invitation tools (invite by email, generate shareable link) at the top and the list of all invited persons with their status (eingeladen, angemeldet, abgelehnt) below

#### Scenario: Send new invitation
- **WHEN** the organizer enters an email address and clicks "Einladen"
- **THEN** the invitation SHALL be sent and the person SHALL appear in the invited persons list with status "eingeladen"

### Requirement: Aktivität combined tab
The "Aktivität" tab SHALL combine the former "Timeline", "E-Mails", and "Exporte" tabs into a unified activity log. All event-related activities (registrations, emails sent, exports generated, payment changes, setting changes) SHALL be displayed in a chronological feed.

#### Scenario: Activity log shows all event actions
- **WHEN** the organizer opens the "Aktivität" tab
- **THEN** the tab SHALL display a chronological list of all event activities including registrations, sent emails, generated exports, payment updates, and configuration changes

#### Scenario: Export actions in activity tab
- **WHEN** the organizer clicks "Export erstellen" in the "Aktivität" tab
- **THEN** the export SHALL be generated and a new activity entry "Export erstellt" SHALL appear in the feed

### Requirement: Participant filter capabilities
The "Teilnehmende" tab SHALL provide filter controls for: booking option, payment status (bezahlt, offen, teilweise), label, and a search-by-name text input. Filters SHALL be combinable and applied immediately.

#### Scenario: Filter by booking option
- **WHEN** the organizer selects booking option "Frühbucher" from the filter dropdown
- **THEN** the participant list SHALL show only participants with the "Frühbucher" booking option

#### Scenario: Filter by payment status
- **WHEN** the organizer selects payment status "offen"
- **THEN** the participant list SHALL show only participants with outstanding payments

#### Scenario: Combined filters
- **WHEN** the organizer filters by booking option "Standard" AND payment status "bezahlt"
- **THEN** the participant list SHALL show only participants matching both criteria

#### Scenario: Search by name
- **WHEN** the organizer types "Müller" in the search field
- **THEN** the participant list SHALL show only participants whose name contains "Müller"

#### Scenario: Clear all filters
- **WHEN** the organizer clicks "Filter zurücksetzen"
- **THEN** all filters SHALL be cleared and the full participant list SHALL be displayed

### Requirement: Payment filter capabilities
The "Zahlungen" tab SHALL provide filter controls for: payment method, date range (start and end date), and payment status. Filters SHALL be applied immediately.

#### Scenario: Filter payments by method
- **WHEN** the organizer selects payment method "Überweisung" from the filter
- **THEN** the payments list SHALL show only payments made via bank transfer

#### Scenario: Filter payments by date range
- **WHEN** the organizer sets the date range to 01.03.2026 – 31.03.2026
- **THEN** the payments list SHALL show only payments within that date range

#### Scenario: Filter payments by status
- **WHEN** the organizer selects payment status "ausstehend"
- **THEN** the payments list SHALL show only pending payments

### Requirement: Activity filter capabilities
The "Aktivität" tab SHALL provide filter controls for: action type (Anmeldung, E-Mail, Export, Zahlung, Einstellung), date range, and participant name. Filters SHALL be applied immediately.

#### Scenario: Filter activity by type
- **WHEN** the organizer selects action type "E-Mail"
- **THEN** the activity feed SHALL show only email-related entries

#### Scenario: Filter activity by participant
- **WHEN** the organizer types "Schmidt" in the participant filter
- **THEN** the activity feed SHALL show only entries related to participants named "Schmidt"

#### Scenario: Filter activity by date range
- **WHEN** the organizer sets a date range filter
- **THEN** the activity feed SHALL show only entries within that date range

### Requirement: URL parameter mapping for tabs
The `?tab=` URL parameter SHALL map to the new tab IDs: `overview`, `participants`, `invitations`, `packlist`, `payments`, `activity`, `settings`. Navigating to a URL with a valid `?tab=` value SHALL open the corresponding tab.

#### Scenario: Direct URL to participants tab
- **WHEN** a user navigates to `/events/app/{slug}?tab=participants`
- **THEN** the "Teilnehmende" tab SHALL be active

#### Scenario: Invalid tab parameter
- **WHEN** a user navigates to `/events/app/{slug}?tab=invalid`
- **THEN** the dashboard SHALL fall back to the "Übersicht" tab

#### Scenario: Legacy tab parameter redirect
- **WHEN** a user navigates with an old tab parameter like `?tab=management`
- **THEN** the dashboard SHALL redirect to the equivalent new tab `?tab=participants`

### Requirement: Mobile-friendly scrollable tab bar
The tab bar SHALL be horizontally scrollable on screens narrower than 768px. The active tab SHALL be automatically scrolled into view. Touch scrolling SHALL be smooth and natural.

#### Scenario: Tab bar on mobile
- **WHEN** the dashboard is viewed on a 375px wide screen
- **THEN** the tab bar SHALL be horizontally scrollable showing approximately 3 tabs visible at a time with the rest accessible by scrolling

#### Scenario: Active tab scroll into view
- **WHEN** the user navigates to `?tab=activity` on a mobile device
- **THEN** the "Aktivität" tab SHALL be scrolled into view in the tab bar

#### Scenario: Tab bar on desktop
- **WHEN** the dashboard is viewed on a screen wider than 768px
- **THEN** all 7 tabs SHALL be visible without scrolling
