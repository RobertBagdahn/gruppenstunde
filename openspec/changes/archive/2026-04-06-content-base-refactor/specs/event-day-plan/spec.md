## ADDED Requirements

### Requirement: EventDaySlot Model
The system SHALL provide an `EventDaySlot` model in the event app for time-based scheduling within events. Fields: event (FK to Event), date (DateField), start_time (TimeField), end_time (TimeField), title (CharField, blank), notes (TextField, blank), content_type (FK to ContentType, nullable), object_id (PositiveIntegerField, nullable), sort_order (PositiveIntegerField).

#### Scenario: Adding a game to an event day plan
- **WHEN** an event organizer adds a Game to a time slot
- **THEN** an EventDaySlot SHALL be created with the Game's ContentType and ID
- **THEN** the slot SHALL display the Game's title and a link to the Game detail page

#### Scenario: Adding a GroupSession to an event day plan
- **WHEN** an event organizer adds a GroupSession to a time slot
- **THEN** an EventDaySlot SHALL be created with the GroupSession's ContentType and ID

#### Scenario: Free-form time slot without content link
- **WHEN** an event organizer creates a time slot with only title and time
- **THEN** the EventDaySlot SHALL be created with content_type=null and object_id=null
- **THEN** the slot SHALL display the custom title and notes

### Requirement: Event Day Plan UI
The event detail page SHALL include a "Tagesplan" section displaying time slots grouped by date. Each day SHALL show a vertical timeline of slots.

#### Scenario: Viewing event day plan
- **WHEN** a user views an event with day slots
- **THEN** the "Tagesplan" section SHALL show days as columns (desktop) or collapsible sections (mobile)
- **THEN** each slot SHALL show: time range, title/content name, content type badge, notes

#### Scenario: Adding a time slot
- **WHEN** an event organizer clicks "Zeitslot hinzufügen" on a day
- **THEN** a dialog SHALL open with: date (pre-filled), start_time, end_time, optional content search (search Games and GroupSessions), title (for free-form), notes

#### Scenario: Searching content for time slot
- **WHEN** the organizer searches for content to assign to a time slot
- **THEN** the search SHALL cover GroupSessions and Games
- **THEN** results SHALL show content type badge, title, and difficulty

### Requirement: Event Day Plan API
The system SHALL provide API endpoints for managing EventDaySlots under the event router.

#### Scenario: List day slots for event
- **WHEN** GET `/api/events/{event_id}/day-slots/`
- **THEN** the system SHALL return all day slots for the event, sorted by date and start_time

#### Scenario: Create day slot
- **WHEN** POST `/api/events/{event_id}/day-slots/` with date, start_time, end_time, and optional content reference
- **THEN** an EventDaySlot SHALL be created for the event

#### Scenario: Update day slot
- **WHEN** PATCH `/api/events/{event_id}/day-slots/{slot_id}/`
- **THEN** the day slot SHALL be updated with the provided fields

#### Scenario: Delete day slot
- **WHEN** DELETE `/api/events/{event_id}/day-slots/{slot_id}/`
- **THEN** the day slot SHALL be hard-deleted (not soft-deleted, as it's a scheduling entry)

### Requirement: MealPlan integration in Event Day Plan
The event day plan SHALL visually integrate with the existing MealPlan system. Meal-related time slots SHALL show the assigned recipes from the MealPlan.

#### Scenario: Event with MealPlan and Day Plan
- **WHEN** an event has both a MealPlan and day slots
- **THEN** meal times (breakfast, lunch, dinner) from the MealPlan SHALL be displayed alongside other day slots
- **THEN** meal slots SHALL show the assigned recipes with links to recipe detail pages
