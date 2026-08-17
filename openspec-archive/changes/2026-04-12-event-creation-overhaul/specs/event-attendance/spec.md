## ADDED Requirements

### Requirement: AttendanceRecord model
A new `AttendanceRecord` model SHALL be created to track participant check-in and check-out.

#### Scenario: AttendanceRecord model fields
- **WHEN** the AttendanceRecord model is defined
- **THEN** it SHALL have the following fields:
  - `participant` — ForeignKey to Participant (on_delete=CASCADE)
  - `checked_in_at` — DateTimeField (nullable, default=null)
  - `checked_out_at` — DateTimeField (nullable, default=null)
  - `checked_in_by` — ForeignKey to User (nullable, default=null, on_delete=SET_NULL)

#### Scenario: One attendance record per participant
- **WHEN** a check-in is created for a participant
- **THEN** only one AttendanceRecord SHALL exist per participant (unique constraint on `participant`)

### Requirement: Check-in endpoint
A `POST /api/events/{slug}/attendance/` endpoint SHALL check in a participant.

#### Scenario: Check in a participant
- **WHEN** POST `/api/events/{slug}/attendance/` with body `{participant_id}`
- **THEN** an AttendanceRecord SHALL be created with `checked_in_at` set to the current timestamp
- **THEN** `checked_in_by` SHALL be set to the authenticated user
- **THEN** the response SHALL return 201 Created with the attendance record data

#### Scenario: Participant already checked in
- **WHEN** POST `/api/events/{slug}/attendance/` for a participant who already has an AttendanceRecord with `checked_in_at` set
- **THEN** the response SHALL return 409 Conflict with message "Teilnehmer ist bereits eingecheckt."

#### Scenario: Only managers can check in
- **WHEN** POST `/api/events/{slug}/attendance/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Check-out endpoint
A `PATCH /api/events/{slug}/attendance/{id}/` endpoint SHALL check out a participant.

#### Scenario: Check out a participant
- **WHEN** PATCH `/api/events/{slug}/attendance/{id}/` with body `{checked_out_at}` or empty body
- **THEN** the `checked_out_at` field SHALL be set to the current timestamp
- **THEN** the response SHALL return 200 OK with the updated attendance record

#### Scenario: Check out without prior check-in
- **WHEN** PATCH `/api/events/{slug}/attendance/{id}/` for a record where `checked_in_at` is null
- **THEN** the response SHALL return 400 Bad Request with message "Teilnehmer wurde noch nicht eingecheckt."

#### Scenario: Only managers can check out
- **WHEN** PATCH `/api/events/{slug}/attendance/{id}/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: List attendance records endpoint
A `GET /api/events/{slug}/attendance/` endpoint SHALL return attendance records for managers.

#### Scenario: List attendance records
- **WHEN** GET `/api/events/{slug}/attendance/?page=1&page_size=20`
- **THEN** the response SHALL return paginated attendance records in standard format: `{items, total, page, page_size, total_pages}`
- **THEN** each record SHALL include: `id`, `participant` (id, first_name, last_name, scout_name, booking_option_name), `checked_in_at`, `checked_out_at`, `checked_in_by` (id, name)

#### Scenario: Non-manager cannot list attendance
- **WHEN** GET `/api/events/{slug}/attendance/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Batch check-in
Managers SHALL be able to check in multiple participants at once.

#### Scenario: Batch check-in request
- **WHEN** POST `/api/events/{slug}/attendance/batch/` with body `{participant_ids: [1, 2, 3]}`
- **THEN** AttendanceRecords SHALL be created for all specified participants
- **THEN** participants who are already checked in SHALL be skipped without error
- **THEN** the response SHALL return 200 OK with `{created: number, skipped: number}`

#### Scenario: Only managers can batch check-in
- **WHEN** POST `/api/events/{slug}/attendance/batch/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Attendance toggle UI in Teilnehmende tab
The "Teilnehmende" tab SHALL include an attendance view with toggle switches for check-in/check-out.

#### Scenario: Attendance view availability
- **WHEN** a manager views the "Teilnehmende" tab during the "running" phase
- **THEN** an "Anwesenheit" view SHALL be available as a toggle or sub-tab
- **THEN** each participant row SHALL display a toggle switch for check-in/check-out

#### Scenario: Attendance view outside running phase for managers
- **WHEN** a manager views the "Teilnehmende" tab outside the "running" phase
- **THEN** the "Anwesenheit" view SHALL still be accessible for managers

#### Scenario: Non-managers cannot see attendance view
- **WHEN** a non-manager views the "Teilnehmende" tab
- **THEN** the "Anwesenheit" view SHALL NOT be displayed

#### Scenario: Toggle check-in via UI
- **WHEN** a manager toggles a participant's switch to "on"
- **THEN** the system SHALL call `POST /api/events/{slug}/attendance/` with the participant's ID
- **THEN** the toggle SHALL reflect the checked-in state

#### Scenario: Toggle check-out via UI
- **WHEN** a manager toggles a checked-in participant's switch to "off"
- **THEN** the system SHALL call `PATCH /api/events/{slug}/attendance/{id}/` to set `checked_out_at`
- **THEN** the toggle SHALL reflect the checked-out state

### Requirement: Attendance summary
The attendance view SHALL display a summary of check-in counts.

#### Scenario: Summary display
- **WHEN** a manager views the attendance view
- **THEN** a summary line SHALL be displayed: "{checked_in_count} von {total_participants} eingecheckt"

#### Scenario: Summary updates in real-time
- **WHEN** a manager checks in or checks out a participant
- **THEN** the summary count SHALL update immediately without requiring a page reload

### Requirement: Attendance data in exports
Attendance data SHALL be included in participant export files.

#### Scenario: CSV export includes attendance
- **WHEN** a manager exports participant data as CSV
- **THEN** the export SHALL include columns: `checked_in_at`, `checked_out_at`, `checked_in_by`

#### Scenario: Participants without attendance record
- **WHEN** a participant has no AttendanceRecord
- **THEN** the export columns `checked_in_at`, `checked_out_at`, `checked_in_by` SHALL be empty

### Requirement: Timeline entries for attendance
Each check-in and check-out SHALL create a timeline entry for the event.

#### Scenario: Check-in timeline entry
- **WHEN** a participant is checked in
- **THEN** a timeline entry SHALL be created with type `attendance_check_in` and message "{participant_name} wurde eingecheckt"

#### Scenario: Check-out timeline entry
- **WHEN** a participant is checked out
- **THEN** a timeline entry SHALL be created with type `attendance_check_out` and message "{participant_name} wurde ausgecheckt"
