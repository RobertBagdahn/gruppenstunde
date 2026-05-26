## ADDED Requirements

### Requirement: WaitlistEntry model
A new `WaitlistEntry` model SHALL be created to track users waiting for a spot in a full booking option.

#### Scenario: WaitlistEntry model fields
- **WHEN** the WaitlistEntry model is defined
- **THEN** it SHALL have the following fields:
  - `event` — ForeignKey to Event (on_delete=CASCADE)
  - `booking_option` — ForeignKey to BookingOption (on_delete=CASCADE)
  - `user` — ForeignKey to User (on_delete=CASCADE)
  - `person` — ForeignKey to Person (on_delete=SET_NULL, null=True)
  - `created_at` — DateTimeField (auto_now_add=True)
  - `notified_at` — DateTimeField (nullable, default=null)
  - `expired_at` — DateTimeField (nullable, default=null)
- **NOTE** The `person` FK uses `SET_NULL` (not `CASCADE`) for consistency with the existing `Participant.person` FK pattern. When a Person record is deleted, the WaitlistEntry is preserved with `person=null` rather than being cascade-deleted.

#### Scenario: Waitlist ordering
- **WHEN** waitlist entries are queried
- **THEN** they SHALL be ordered by `created_at` ascending (FIFO)

### Requirement: Join waitlist endpoint
A `POST /api/events/{slug}/waitlist/` endpoint SHALL allow users to join the waitlist for a full booking option.

#### Scenario: Join waitlist for full booking option
- **WHEN** POST `/api/events/{slug}/waitlist/` with body `{booking_option_id, person_id}`
- **THEN** a new WaitlistEntry SHALL be created for the authenticated user
- **THEN** the response SHALL return 201 Created with the waitlist entry data

#### Scenario: Cannot join waitlist for non-full option
- **WHEN** POST `/api/events/{slug}/waitlist/` for a booking option where `is_full` is `false`
- **THEN** the response SHALL return 400 Bad Request with message "Diese Buchungsoption ist noch nicht voll."

#### Scenario: Cannot join waitlist twice
- **WHEN** POST `/api/events/{slug}/waitlist/` and the user already has an active (non-expired) waitlist entry for the same booking option and person
- **THEN** the response SHALL return 409 Conflict with message "Du bist bereits auf der Warteliste."

### Requirement: List waitlist entries endpoint
A `GET /api/events/{slug}/waitlist/` endpoint SHALL return waitlist entries for managers.

#### Scenario: Manager lists waitlist entries
- **WHEN** GET `/api/events/{slug}/waitlist/?page=1&page_size=20`
- **THEN** the response SHALL return paginated waitlist entries in standard format: `{items, total, page, page_size, total_pages}`
- **THEN** each entry SHALL include: `id`, `booking_option` (id, name), `user` (id, name), `person` (id, first_name, last_name), `created_at`, `notified_at`, `expired_at`

#### Scenario: Non-manager cannot list waitlist
- **WHEN** GET `/api/events/{slug}/waitlist/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Remove from waitlist endpoint
A `DELETE /api/events/{slug}/waitlist/{id}/` endpoint SHALL allow removal from the waitlist.

#### Scenario: User removes own waitlist entry
- **WHEN** DELETE `/api/events/{slug}/waitlist/{id}/` by the user who created the entry
- **THEN** the entry SHALL be deleted
- **THEN** the response SHALL return 204 No Content

#### Scenario: Manager removes any waitlist entry
- **WHEN** DELETE `/api/events/{slug}/waitlist/{id}/` by a manager
- **THEN** the entry SHALL be deleted regardless of who created it

#### Scenario: Non-owner non-manager cannot remove
- **WHEN** DELETE `/api/events/{slug}/waitlist/{id}/` by a user who is neither the entry owner nor a manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Automatic waitlist notification on cancellation
When a participant cancels or is removed from a full booking option, the system SHALL automatically notify the first active waitlist entry.

#### Scenario: Participant cancels and waitlist exists
- **WHEN** a participant cancels or is removed from a booking option
- **AND** the booking option was previously full
- **AND** there are active (non-notified, non-expired) waitlist entries
- **THEN** the system SHALL send a notification email to the first waitlist entry (by `created_at`)
- **THEN** the `notified_at` field SHALL be set to the current timestamp

#### Scenario: Notification email content
- **WHEN** a waitlist notification email is sent
- **THEN** the email SHALL include a reservation link
- **THEN** the email SHALL state that the reservation is valid for 48 hours
- **THEN** the email subject SHALL be "Ein Platz ist frei geworden – {event_name}"

#### Scenario: Reservation expires after 48 hours
- **WHEN** 48 hours have passed since `notified_at` without the user completing registration
- **THEN** the `expired_at` field SHALL be set to the current timestamp
- **THEN** the system SHALL automatically notify the next active waitlist entry

### Requirement: Registration form waitlist button
When a booking option is full, the registration form SHALL show a waitlist button instead of the regular registration button.

#### Scenario: Full booking option shows waitlist button
- **WHEN** a user views the registration form for an event
- **AND** a booking option has `is_full: true`
- **THEN** the booking option SHALL display "Auf Warteliste setzen" button instead of the regular registration button

#### Scenario: Successful waitlist join feedback
- **WHEN** a user clicks "Auf Warteliste setzen" and the request succeeds
- **THEN** a success message "Du wurdest auf die Warteliste gesetzt." SHALL be displayed

### Requirement: Waitlist display for managers
Managers SHALL see the waitlist in the "Teilnehmende" tab.

#### Scenario: Waitlist section in Teilnehmende tab
- **WHEN** a manager views the "Teilnehmende" tab for an event with waitlist entries
- **THEN** a "Warteliste" section SHALL be displayed below the participant list
- **THEN** each entry SHALL show: person name, booking option name, date joined, notification status

#### Scenario: No waitlist entries
- **WHEN** a manager views the "Teilnehmende" tab and no waitlist entries exist
- **THEN** the "Warteliste" section SHALL NOT be displayed

### Requirement: User waitlist status display
Users SHALL see their own waitlist status in the event "Übersicht" tab.

#### Scenario: User on waitlist views overview
- **WHEN** a user who is on the waitlist views the event "Übersicht" tab
- **THEN** a notice SHALL be displayed: "Du stehst auf der Warteliste für {booking_option_name}."
- **THEN** a "Von Warteliste entfernen" button SHALL be available

#### Scenario: User not on waitlist
- **WHEN** a user who is not on the waitlist views the event "Übersicht" tab
- **THEN** no waitlist notice SHALL be displayed
