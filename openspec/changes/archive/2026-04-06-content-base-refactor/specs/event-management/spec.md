## ADDED Requirements

### Requirement: EventDaySlot in Event model
The Event model SHALL support day-based scheduling via the new EventDaySlot model. Events SHALL have a `day_slots` reverse relation.

#### Scenario: Event with day plan
- **WHEN** an event has day slots
- **THEN** the event detail page SHALL show a "Tagesplan" section
- **THEN** the day plan SHALL be grouped by date with time slots within each day

### Requirement: Event Day Plan CRUD API
The event API SHALL include endpoints for managing EventDaySlots.

#### Scenario: Creating a day slot
- **WHEN** POST `/api/events/{event_id}/day-slots/` with date, start_time, end_time
- **THEN** an EventDaySlot SHALL be created for the event
- **THEN** optional content_type and object_id SHALL link the slot to a Game or GroupSession

#### Scenario: Listing day slots
- **WHEN** GET `/api/events/{event_id}/day-slots/`
- **THEN** all day slots SHALL be returned grouped by date, sorted by start_time

#### Scenario: Content search for day slots
- **WHEN** GET `/api/events/{event_id}/day-slots/search-content/?q=feuer`
- **THEN** the system SHALL search GroupSessions and Games matching the query
- **THEN** results SHALL include content_type, title, and slug for each match

## MODIFIED Requirements

### Requirement: Event detail includes day plan
The event detail API response SHALL include the day_slots data.

#### Scenario: Event detail with day slots
- **WHEN** GET `/api/events/{event_id}/`
- **THEN** the response SHALL include a `day_slots` array grouped by date
- **THEN** each slot SHALL include: date, start_time, end_time, title, notes, content_type, content_title, content_slug
