## MODIFIED Requirements

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
