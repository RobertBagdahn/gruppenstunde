## MODIFIED Requirements

### Requirement: Event detail API response
The event detail API response SHALL include responsible person contact information and enhanced participant data.

#### Scenario: Event detail includes contact persons
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include `responsible_persons_detail`: list of {id, first_name, last_name, email} for each responsible person
- **THEN** these details SHALL be visible to all users who can see the event (not just managers)

#### Scenario: Event detail includes day slots
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include a `day_slots` array grouped by date
- **THEN** each slot SHALL include: date, start_time, end_time, title, notes, content_type, content_title, content_slug

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

#### Scenario: Participant list with filters
- **WHEN** GET `/api/events/{slug}/participants/?is-paid=true&booking-option-id=5&label-id=3&search=Max`
- **THEN** the system SHALL return only participants matching ALL filter criteria
- **THEN** the search filter SHALL match against first_name, last_name, scout_name, and email

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
