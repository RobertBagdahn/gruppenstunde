## Requirements

### Requirement: Event detail API response
The event detail API response SHALL include responsible person contact information, enhanced participant data, computed phase, and role-appropriate participant statistics.

#### Scenario: Event detail includes contact persons
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include `responsible_persons_detail`: list of {id, first_name, last_name, email} for each responsible person
- **THEN** these details SHALL be visible to all users who can see the event (not just managers)

#### Scenario: Event detail includes day slots
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include a `day_slots` array grouped by date
- **THEN** each slot SHALL include: date, start_time, end_time, title, notes, content_type, content_title, content_slug

#### Scenario: Event detail includes computed phase
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include a `phase` field computed from date fields
- **THEN** the phase SHALL be one of: `draft`, `pre_registration`, `registration`, `pre_event`, `running`, `completed`

#### Scenario: Event detail includes participant stats for members
- **WHEN** GET `/api/events/{slug}/` by an invited member
- **AND** `participant_visibility` is not `none`
- **THEN** the response SHALL include `participant_stats` with data matching the visibility level:
  - `total_only`: `{ total: number }`
  - `per_option`: `{ total: number, by_option: [{ option_id, option_name, count, max_participants }] }`
  - `with_names`: Same as `per_option` plus `participants: [{ first_name }]` per option

#### Scenario: Event detail includes full stats for managers
- **WHEN** GET `/api/events/{slug}/` by a manager
- **THEN** the response SHALL include `participant_stats` with full data regardless of `participant_visibility` setting

#### Scenario: Event detail includes user registration info
- **WHEN** GET `/api/events/{slug}/` by an authenticated user
- **THEN** the response SHALL include `user_registration`: `{ is_registered: boolean, registration_id: number | null, participant_count: number }`

#### Scenario: Event detail includes invitation counts for managers
- **WHEN** GET `/api/events/{slug}/` by a manager
- **THEN** the response SHALL include `invitation_counts`: `{ total: number, accepted: number, pending: number }`

### Requirement: Event model participant visibility field
The Event model SHALL have a `participant_visibility` field to control what registered user data is visible to members.

#### Scenario: New field on Event model
- **WHEN** an Event is created
- **THEN** the `participant_visibility` field SHALL default to `none`
- **THEN** the field SHALL accept one of: `none`, `total_only`, `per_option`, `with_names`

#### Scenario: Update participant visibility
- **WHEN** PATCH `/api/events/{slug}/` with `participant_visibility` set to a valid value
- **THEN** the field SHALL be updated
- **THEN** only managers SHALL be able to update this field

### Requirement: Participant list with extended data
The participant list endpoint SHALL return extended data including payments, labels, and custom field values.

#### Scenario: Extended participant response
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include:
  - Standard fields: id, first_name, last_name, scout_name, email, birthday, gender, address, zip_code, city, booking_option, nutritional_tags
  - Payment data: is_paid (computed), total_paid, remaining_amount
  - Labels: list of {id, name, color}
  - Custom field values: list of {custom_field_id, label, field_type, value}
  - Registration timestamp: created_at
  - Booking option metadata: booking_option_is_system (boolean, indicates if the assigned option is a system option)

#### Scenario: Participant list with filters
- **WHEN** GET `/api/events/{slug}/participants/?is-paid=true&booking-option-id=5&label-id=3&search=Max`
- **THEN** the system SHALL return only participants matching ALL filter criteria
- **THEN** the search filter SHALL match against first_name, last_name, scout_name, and email
- **THEN** filtering by `booking-option-id` SHALL also work for system BookingOptions (for managers)

#### Scenario: Participant list pagination
- **WHEN** GET `/api/events/{slug}/participants/?page=1&page-size=20`
- **THEN** the response SHALL use the standard paginated format: {items, total, page, page_size, total_pages}

### Requirement: Participant update creates timeline entry
The participant update endpoint SHALL log changes to the timeline. Custom field values are managed via a separate endpoint (see event-custom-fields spec).

#### Scenario: Participant update creates timeline entry
- **WHEN** PATCH `/api/events/{slug}/participants/{id}/` with any data change (name, booking option, etc.)
- **THEN** a TimelineEntry with action_type `participant_updated` SHALL be created
- **THEN** the metadata SHALL describe what was changed
- **NOTE** Custom field values are NOT set via this endpoint — use `PATCH /api/events/{slug}/participants/{id}/custom-fields/` instead (see event-custom-fields spec)
