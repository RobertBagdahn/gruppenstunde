## ADDED Requirements

### Requirement: RoomAssignment model
A new `RoomAssignment` model SHALL be created to represent rooms or tents that participants can be assigned to.

#### Scenario: RoomAssignment model fields
- **WHEN** the RoomAssignment model is defined
- **THEN** it SHALL have the following fields:
  - `event` — ForeignKey to Event (on_delete=CASCADE, related_name="room_assignments")
  - `name` — CharField(max_length=100, verbose_name="Name")
  - `capacity` — IntegerField(default=0, verbose_name="Kapazität")
  - `description` — TextField(blank=True, default="", verbose_name="Beschreibung")
  - `sort_order` — IntegerField(default=0, verbose_name="Sortierung")
  - `participants` — ManyToManyField to Participant (blank=True, related_name="room_assignments", verbose_name="Teilnehmer")
  - `created_at` — DateTimeField(auto_now_add=True)
  - `updated_at` — DateTimeField(auto_now=True)

#### Scenario: RoomAssignment ordering
- **WHEN** RoomAssignment records are queried
- **THEN** they SHALL be ordered by `sort_order` ascending, then `id` ascending

#### Scenario: Participant can only be in one room per event
- **WHEN** a participant is assigned to a room
- **AND** the participant is already assigned to a different room for the same event
- **THEN** the participant SHALL be removed from the previous room before being assigned to the new one

### Requirement: List rooms endpoint
A `GET /api/events/{slug}/rooms/` endpoint SHALL return all rooms for an event.

#### Scenario: List rooms with participants
- **WHEN** GET `/api/events/{slug}/rooms/`
- **THEN** the response SHALL return a list of rooms, each containing:
  - `id`, `name`, `capacity`, `description`, `sort_order`
  - `participants` — list of `{id, first_name, last_name, scout_name, booking_option_name}`
  - `participant_count` — number of assigned participants
- **THEN** the response SHALL also include an `unassigned` list of participants not assigned to any room

#### Scenario: Only managers can list rooms
- **WHEN** GET `/api/events/{slug}/rooms/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Create room endpoint
A `POST /api/events/{slug}/rooms/` endpoint SHALL create a new room.

#### Scenario: Create a room
- **WHEN** POST `/api/events/{slug}/rooms/` with body `{name: "Zelt 1", capacity: 6, description: "Großes Gruppenzelt"}`
- **THEN** a RoomAssignment record SHALL be created for the event
- **THEN** `sort_order` SHALL default to the next available value (max existing + 1)
- **THEN** the response SHALL return 201 Created with the room data

#### Scenario: Only managers can create rooms
- **WHEN** POST `/api/events/{slug}/rooms/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Update room endpoint
A `PATCH /api/events/{slug}/rooms/{id}/` endpoint SHALL update a room's details.

#### Scenario: Update room name and capacity
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/` with body `{name: "Zelt A", capacity: 8}`
- **THEN** the room's name and capacity SHALL be updated
- **THEN** the response SHALL return 200 OK with the updated room data

#### Scenario: Only managers can update rooms
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Delete room endpoint
A `DELETE /api/events/{slug}/rooms/{id}/` endpoint SHALL delete a room.

#### Scenario: Delete a room
- **WHEN** DELETE `/api/events/{slug}/rooms/{id}/`
- **THEN** the room SHALL be deleted
- **THEN** all participant assignments to this room SHALL be cleared (M2M entries removed)
- **THEN** the response SHALL return 204 No Content

#### Scenario: Only managers can delete rooms
- **WHEN** DELETE `/api/events/{slug}/rooms/{id}/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Assign participants to room endpoint
A `PATCH /api/events/{slug}/rooms/{id}/assign/` endpoint SHALL assign or unassign participants.

#### Scenario: Assign participants to a room
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/assign/` with body `{add_participant_ids: [1, 2, 3]}`
- **THEN** the specified participants SHALL be added to the room's participants M2M
- **THEN** if any participant was previously in a different room, they SHALL be removed from the old room first
- **THEN** the response SHALL return 200 OK with the updated room data

#### Scenario: Unassign participants from a room
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/assign/` with body `{remove_participant_ids: [2]}`
- **THEN** the specified participants SHALL be removed from the room's participants M2M
- **THEN** the response SHALL return 200 OK with the updated room data

#### Scenario: Assign beyond capacity
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/assign/` would result in more participants than `capacity`
- **AND** `capacity` is greater than 0
- **THEN** the response SHALL return 400 Bad Request with message "Die Kapazität von {capacity} Plätzen wäre überschritten."

#### Scenario: Capacity of 0 means unlimited
- **WHEN** a room has `capacity = 0`
- **THEN** there SHALL be no limit on the number of participants assigned

#### Scenario: Only managers can assign participants
- **WHEN** PATCH `/api/events/{slug}/rooms/{id}/assign/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Pydantic schemas for room assignments
Pydantic schemas SHALL be defined for room assignment API requests and responses.

#### Scenario: RoomAssignmentOut schema
- **WHEN** a room is serialized via `RoomAssignmentOut`
- **THEN** it SHALL include: `id`, `name`, `capacity`, `description`, `sort_order`, `participants` (list of participant summaries), `participant_count`

#### Scenario: RoomAssignmentCreateIn schema
- **WHEN** a room creation request is validated
- **THEN** the `RoomAssignmentCreateIn` schema SHALL accept: `name` (required), `capacity` (optional, default 0), `description` (optional, default "")

#### Scenario: RoomAssignmentUpdateIn schema
- **WHEN** a room update request is validated
- **THEN** the `RoomAssignmentUpdateIn` schema SHALL accept all fields as optional: `name`, `capacity`, `description`, `sort_order`

### Requirement: Zod schemas for room assignments
Frontend Zod schemas SHALL be synchronized with the backend Pydantic schemas.

#### Scenario: Zod RoomAssignment schema
- **WHEN** the Zod schema is defined in `frontend/src/schemas/event.ts`
- **THEN** it SHALL define `RoomAssignmentSchema` matching the `RoomAssignmentOut` Pydantic schema

### Requirement: Drag-and-drop room assignment UI
The "Teilnehmende" tab SHALL include a drag-and-drop interface for assigning participants to rooms (manager view only).

#### Scenario: Room assignment view access
- **WHEN** a manager views the "Teilnehmende" tab
- **THEN** a "Zimmereinteilung" view SHALL be available as a toggle or sub-tab
- **THEN** non-managers SHALL NOT see this view

#### Scenario: Room columns display
- **WHEN** a manager opens the "Zimmereinteilung" view
- **THEN** each room SHALL be displayed as a column or card
- **THEN** each room header SHALL show: room name, capacity indicator (e.g. "3/6"), and edit/delete buttons
- **THEN** a "Nicht eingeteilt" section SHALL list all participants not assigned to any room

#### Scenario: Drag participant to room
- **WHEN** a manager drags a participant card from "Nicht eingeteilt" or another room into a room
- **THEN** the system SHALL call `PATCH /api/events/{slug}/rooms/{id}/assign/` with `{add_participant_ids: [participant_id]}`
- **THEN** the participant card SHALL move to the target room visually
- **THEN** the capacity indicator SHALL update

#### Scenario: Drag participant to "Nicht eingeteilt"
- **WHEN** a manager drags a participant card from a room into the "Nicht eingeteilt" section
- **THEN** the system SHALL call `PATCH /api/events/{slug}/rooms/{id}/assign/` with `{remove_participant_ids: [participant_id]}`
- **THEN** the participant card SHALL move to "Nicht eingeteilt"

#### Scenario: Capacity full visual feedback
- **WHEN** a room has reached its capacity (participant_count >= capacity and capacity > 0)
- **THEN** the capacity indicator SHALL be styled in red/warning color
- **THEN** attempting to drag a participant into the full room SHALL show an error toast: "Die Kapazität von {capacity} Plätzen wäre überschritten."

### Requirement: Visual capacity indicator
Each room SHALL display a visual indicator of how many spots are filled.

#### Scenario: Capacity indicator format
- **WHEN** a room has 3 participants assigned and a capacity of 6
- **THEN** the indicator SHALL display "3/6"
- **THEN** a progress bar or fill indicator SHALL visually represent the ratio

#### Scenario: Unlimited capacity display
- **WHEN** a room has capacity 0 (unlimited)
- **THEN** the indicator SHALL display only the participant count (e.g. "3 Teilnehmer")
- **THEN** no progress bar SHALL be shown

### Requirement: Create and edit room from UI
Managers SHALL be able to create and edit rooms directly from the room assignment view.

#### Scenario: Create room
- **WHEN** a manager clicks "Raum hinzufügen" in the room assignment view
- **THEN** a dialog SHALL open with fields: Name (required), Kapazität (number, default 0), Beschreibung (optional)
- **THEN** submitting SHALL call `POST /api/events/{slug}/rooms/` and add the room to the view

#### Scenario: Edit room
- **WHEN** a manager clicks the edit button on a room header
- **THEN** a dialog SHALL open pre-filled with the room's current data
- **THEN** submitting SHALL call `PATCH /api/events/{slug}/rooms/{id}/` and update the room display

#### Scenario: Delete room
- **WHEN** a manager clicks the delete button on a room header
- **THEN** a confirmation dialog SHALL appear: "Möchtest du den Raum '{name}' wirklich löschen? Alle Teilnehmer werden auf 'Nicht eingeteilt' gesetzt."
- **THEN** confirming SHALL call `DELETE /api/events/{slug}/rooms/{id}/` and remove the room from the view

### Requirement: Print-friendly room assignment list
The room assignment view SHALL support a print-friendly layout.

#### Scenario: Print room assignments
- **WHEN** a manager clicks "Zimmereinteilung drucken" in the room assignment view
- **THEN** a print-optimized layout SHALL be rendered showing:
  - Event name and date as header
  - Each room as a section with name, capacity, and participant list (name + scout_name)
  - "Nicht eingeteilt" section at the end (if any unassigned participants)
- **THEN** CSS `@media print` rules SHALL format the layout for A4 paper
