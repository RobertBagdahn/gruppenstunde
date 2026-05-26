## ADDED Requirements

### Requirement: Calendar view toggle on event landing page
The event landing page SHALL support a calendar view as an alternative to the list view.

#### Scenario: View mode toggle
- **WHEN** a user visits the event landing page
- **THEN** a toggle control SHALL be displayed with options "Liste" and "Kalender"
- **THEN** the active view mode SHALL be determined by the URL parameter `?view=list` or `?view=calendar`
- **THEN** the default view SHALL be `list` when no parameter is present

#### Scenario: URL-driven state persistence
- **WHEN** a user switches between list and calendar views
- **THEN** the URL parameter `?view=` SHALL be updated without a full page reload
- **THEN** reloading the page SHALL restore the selected view mode from the URL

### Requirement: Month grid calendar display
The calendar view SHALL render a month grid using CSS Grid (no external calendar library).

#### Scenario: Month grid layout
- **WHEN** the calendar view is displayed
- **THEN** a 7-column CSS Grid SHALL render the days of the current month
- **THEN** column headers SHALL display abbreviated German day names: "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"
- **THEN** the grid SHALL start on Monday (ISO week standard)

#### Scenario: Days outside current month
- **WHEN** the month grid is rendered
- **THEN** leading and trailing days from adjacent months SHALL be displayed with reduced opacity
- **THEN** these days SHALL NOT be interactive

#### Scenario: Today highlighting
- **WHEN** the current date falls within the displayed month
- **THEN** today's cell SHALL be visually highlighted with a distinct border or background color

### Requirement: Event display on calendar
Events SHALL be displayed on the calendar grid based on their date range.

#### Scenario: Single-day event display
- **WHEN** an event has `start_date` equal to `end_date`
- **THEN** a colored dot or badge SHALL be displayed on that date cell
- **THEN** the dot/badge color SHALL use the Event's `color` field value

#### Scenario: Multi-day event display
- **WHEN** an event spans multiple days (`start_date` != `end_date`)
- **THEN** a colored bar SHALL span across all date cells from `start_date` to `end_date`
- **THEN** the bar color SHALL use the Event's `color` field value
- **THEN** the event title SHALL be displayed on the bar (truncated if necessary)

#### Scenario: Multiple events on the same day
- **WHEN** multiple events overlap on a single date
- **THEN** events SHALL be stacked vertically within the date cell
- **THEN** if more than 3 events overlap, a "+{n} weitere" indicator SHALL be shown

#### Scenario: Event without color
- **WHEN** an event has no `color` field set (null or empty)
- **THEN** a default color (primary theme color) SHALL be used for the dot/bar

### Requirement: Calendar navigation
Users SHALL be able to navigate between months.

#### Scenario: Previous and next month buttons
- **WHEN** the calendar view is displayed
- **THEN** "Vorheriger Monat" (←) and "Nächster Monat" (→) navigation buttons SHALL be displayed
- **THEN** a month/year label SHALL be displayed in German format (e.g., "April 2026")

#### Scenario: Navigate to previous month
- **WHEN** a user clicks the previous month button
- **THEN** the calendar SHALL display the previous month's grid
- **THEN** events for that month SHALL be loaded and displayed

#### Scenario: Navigate to next month
- **WHEN** a user clicks the next month button
- **THEN** the calendar SHALL display the next month's grid
- **THEN** events for that month SHALL be loaded and displayed

#### Scenario: Date calculations use date-fns
- **WHEN** date calculations are performed for the calendar (start of month, end of month, days in month, etc.)
- **THEN** the `date-fns` library SHALL be used (already installed in the project)

### Requirement: Calendar event interaction
Users SHALL be able to interact with events on the calendar.

#### Scenario: Click on event navigates to dashboard
- **WHEN** a user clicks on an event dot, bar, or title in the calendar
- **THEN** navigation SHALL occur to the event dashboard page (`/events/{slug}/`)

#### Scenario: Hover tooltip
- **WHEN** a user hovers over an event on the calendar (desktop only)
- **THEN** a tooltip SHALL display: event title, date range (formatted as "dd.MM. – dd.MM.yyyy"), and location (if set)

### Requirement: Mobile-responsive calendar
The calendar SHALL adapt to small screen sizes.

#### Scenario: Week view on mobile
- **WHEN** the viewport width is below 640px (Tailwind `sm` breakpoint)
- **THEN** the calendar SHALL switch to a week view showing 7 days at a time
- **THEN** week navigation buttons ("Vorherige Woche" / "Nächste Woche") SHALL replace month navigation

#### Scenario: Touch-friendly event targets
- **WHEN** the calendar is displayed on a touch device
- **THEN** event dots/bars SHALL have a minimum touch target size of 44×44px
- **THEN** navigation buttons SHALL have a minimum touch target size of 44×44px
