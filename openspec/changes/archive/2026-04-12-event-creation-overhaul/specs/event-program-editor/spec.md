## ADDED Requirements

### Requirement: Timeline-style program view per day
The event program editor SHALL display a timeline-style view of EventDaySlots grouped by day.

#### Scenario: Day-by-day navigation
- **WHEN** a manager opens the "Programm" tab
- **THEN** a day navigation bar SHALL be displayed with one entry per EventDay
- **THEN** each entry SHALL show the day's date formatted as "Tag {n} – {dd.MM.yyyy}"
- **THEN** clicking an entry SHALL scroll to or display that day's slots

#### Scenario: Timeline slot display
- **WHEN** a manager views a day's timeline
- **THEN** each EventDaySlot SHALL be displayed as a card showing: title, start_time, end_time, notes (truncated), and linked content name if present
- **THEN** slots SHALL be ordered by `sort_order` ascending

#### Scenario: Empty day display
- **WHEN** a day has no EventDaySlots
- **THEN** a placeholder message "Noch keine Programmpunkte für diesen Tag" SHALL be displayed
- **THEN** an "Programmpunkt hinzufügen" button SHALL be shown

### Requirement: Inline slot creation
Managers SHALL be able to create EventDaySlots inline within the timeline view.

#### Scenario: Add slot inline
- **WHEN** a manager clicks "Programmpunkt hinzufügen" on a day
- **THEN** an inline form SHALL appear with fields: title (required), start_time (TimeField), end_time (TimeField), notes (optional textarea)
- **THEN** submitting the form SHALL call `POST /api/events/{slug}/days/{day_id}/slots/`
- **THEN** the new slot SHALL appear in the timeline without a page reload

#### Scenario: Validation of slot times
- **WHEN** a manager submits a slot where `end_time` is before `start_time`
- **THEN** a validation error "Endzeit muss nach der Startzeit liegen." SHALL be displayed
- **THEN** the slot SHALL NOT be created

#### Scenario: Cancel inline creation
- **WHEN** a manager clicks "Abbrechen" on the inline form
- **THEN** the form SHALL be removed and no slot SHALL be created

### Requirement: Slot editing
Managers SHALL be able to edit existing EventDaySlots inline.

#### Scenario: Edit slot fields
- **WHEN** a manager clicks the edit icon on a slot card
- **THEN** the card SHALL transform into an editable form with the current values pre-filled
- **THEN** submitting SHALL call `PATCH /api/events/{slug}/days/{day_id}/slots/{slot_id}/`

#### Scenario: Delete a slot
- **WHEN** a manager clicks the delete icon on a slot card
- **THEN** a confirmation dialog SHALL appear with message "Programmpunkt löschen?"
- **THEN** confirming SHALL call `DELETE /api/events/{slug}/days/{day_id}/slots/{slot_id}/`
- **THEN** the slot SHALL be removed from the timeline without a page reload

### Requirement: Drag-and-drop reordering
Managers SHALL be able to reorder EventDaySlots within a day using drag-and-drop.

#### Scenario: Drag-and-drop library
- **WHEN** drag-and-drop is implemented
- **THEN** it SHALL use the `@dnd-kit/core` and `@dnd-kit/sortable` libraries

#### Scenario: Reorder slots within a day
- **WHEN** a manager drags a slot card to a new position within the same day
- **THEN** the `sort_order` of affected slots SHALL be updated
- **THEN** a `PATCH /api/events/{slug}/days/{day_id}/slots/reorder/` request SHALL be sent with `{slot_ids: [ordered ids]}`
- **THEN** the timeline SHALL reflect the new order immediately via optimistic UI update

#### Scenario: Visual drag feedback
- **WHEN** a manager drags a slot card
- **THEN** the dragged card SHALL have a subtle shadow and reduced opacity
- **THEN** a drop indicator SHALL be shown at the target position

### Requirement: Content linking via search
Each EventDaySlot SHALL support linking to a GroupSession or Game via the existing GenericForeignKey (`content_type` + `object_id`).

#### Scenario: Search and link content
- **WHEN** a manager clicks "Inhalt verknüpfen" on a slot card
- **THEN** a search/autocomplete input SHALL appear
- **THEN** the input SHALL search across GroupSession and Game titles as the user types (debounced, minimum 2 characters)
- **THEN** results SHALL display the content type label ("Gruppenstunde" or "Spiel") and title

#### Scenario: Link content to slot
- **WHEN** a manager selects a search result
- **THEN** the slot's `content_type` and `object_id` SHALL be updated via `PATCH /api/events/{slug}/days/{day_id}/slots/{slot_id}/`
- **THEN** the slot card SHALL display the linked content name with a link to the content detail page

#### Scenario: Unlink content from slot
- **WHEN** a manager clicks the unlink icon on a slot with linked content
- **THEN** the slot's `content_type` and `object_id` SHALL be set to `null`
- **THEN** the slot card SHALL no longer display linked content

### Requirement: Content search API endpoint
A search endpoint SHALL support finding GroupSessions and Games for linking.

#### Scenario: Search content for linking
- **WHEN** GET `/api/events/{slug}/program/search-content/?q={query}`
- **THEN** the response SHALL return a list of matching items with fields: `content_type` (string: "group_session" or "game"), `object_id` (int), `title` (str)
- **THEN** results SHALL be limited to 10 items
- **THEN** results SHALL match on title using case-insensitive contains

#### Scenario: Empty search query
- **WHEN** GET `/api/events/{slug}/program/search-content/?q=`
- **THEN** the response SHALL return an empty list

### Requirement: Print-friendly program view
The program SHALL be viewable in a print-friendly layout.

#### Scenario: Print view trigger
- **WHEN** a manager clicks "Programm drucken" in the program tab
- **THEN** a print-optimized view SHALL be rendered using `@media print` CSS
- **THEN** the view SHALL show all days with all slots in a compact table format

#### Scenario: Print layout content
- **WHEN** the print view is rendered
- **THEN** each day SHALL be displayed as a section header with the date
- **THEN** each slot SHALL show: time range (start_time – end_time), title, linked content name (if any), and notes
- **THEN** drag handles, edit buttons, and navigation controls SHALL be hidden
