## Requirements

### Requirement: MeetingPoint model with user and group ownership
The system SHALL provide a `MeetingPoint` model that stores reusable address entries with structured fields (name, street, zip_code, city, description). Each MeetingPoint MUST have a `created_by` user reference and MAY have an optional `group` reference to a `UserGroup`.

#### Scenario: User creates a personal meeting point
- **WHEN** POST `/api/meeting-points/` with `{ name: "Parkplatz Gemeindehaus", street: "Kirchweg 5", zip_code: "35037", city: "Marburg" }`
- **THEN** the system SHALL create a MeetingPoint with `created_by` set to the authenticated user
- **THEN** the `group` field SHALL be `null`

#### Scenario: User creates a group meeting point
- **WHEN** POST `/api/meeting-points/` with `{ name: "Pfadfinderheim", city: "Marburg", group_id: 3 }`
- **AND** the user is a member of group 3
- **THEN** the system SHALL create a MeetingPoint with `group` set to group 3
- **THEN** the MeetingPoint SHALL be visible to all members of group 3

#### Scenario: User cannot create group meeting point for non-member group
- **WHEN** POST `/api/meeting-points/` with `{ name: "Test", group_id: 99 }`
- **AND** the user is NOT a member of group 99
- **THEN** the system SHALL return HTTP 403

#### Scenario: Unauthenticated user cannot create meeting point
- **WHEN** POST `/api/meeting-points/` without authentication
- **THEN** the system SHALL return HTTP 403

### Requirement: MeetingPoint visibility restricted to owner and group members
The system SHALL restrict MeetingPoint visibility so that only the creator and members of the assigned group can see a MeetingPoint. MeetingPoints MUST NOT be publicly listed.

#### Scenario: User sees own personal meeting points
- **WHEN** GET `/api/meeting-points/` by authenticated user
- **THEN** the response SHALL include MeetingPoints where `created_by` is the current user and `group` is null

#### Scenario: User sees group meeting points
- **WHEN** GET `/api/meeting-points/` by authenticated user who is member of groups [1, 3]
- **THEN** the response SHALL include MeetingPoints where `group_id` is 1 or 3
- **THEN** these SHALL be combined with the user's personal MeetingPoints

#### Scenario: User cannot see other users' personal meeting points
- **WHEN** GET `/api/meeting-points/` by user A
- **AND** user B has created personal MeetingPoints (group=null)
- **THEN** user A SHALL NOT see user B's personal MeetingPoints

#### Scenario: Unauthenticated user cannot list meeting points
- **WHEN** GET `/api/meeting-points/` without authentication
- **THEN** the system SHALL return HTTP 403

### Requirement: MeetingPoint CRUD API
The system SHALL provide full CRUD operations for MeetingPoints at `/api/meeting-points/`.

#### Scenario: List meeting points with pagination
- **WHEN** GET `/api/meeting-points/?page=1&page_size=20`
- **THEN** the response SHALL use the standard paginated format: `{ items, total, page, page_size, total_pages }`
- **THEN** items SHALL only include visible MeetingPoints (own + group)

#### Scenario: Get a single meeting point
- **WHEN** GET `/api/meeting-points/{id}/` for a visible MeetingPoint
- **THEN** the response SHALL return the full MeetingPoint data

#### Scenario: Get a non-visible meeting point
- **WHEN** GET `/api/meeting-points/{id}/` for a MeetingPoint not visible to the user
- **THEN** the system SHALL return HTTP 404

#### Scenario: Update own meeting point
- **WHEN** PATCH `/api/meeting-points/{id}/` with `{ name: "Neuer Name" }`
- **AND** the user is the creator of the MeetingPoint
- **THEN** the system SHALL update the MeetingPoint

#### Scenario: Update group meeting point as group member
- **WHEN** PATCH `/api/meeting-points/{id}/` for a group MeetingPoint
- **AND** the user is a member of the associated group
- **THEN** the system SHALL update the MeetingPoint

#### Scenario: Delete own meeting point
- **WHEN** DELETE `/api/meeting-points/{id}/`
- **AND** the user is the creator
- **THEN** the system SHALL delete the MeetingPoint
- **THEN** any Event FKs (`meeting_point`, `pickup_point`) referencing it SHALL be set to null

### Requirement: Event model meeting and pickup point fields
The `Event` model SHALL have two optional FK fields: `meeting_point` and `pickup_point`, both referencing `MeetingPoint`. These represent the start gathering location and end pickup location respectively.

#### Scenario: Create event with meeting point
- **WHEN** POST `/api/events/` with `{ ..., meeting_point_id: 5 }`
- **THEN** the created event SHALL have `meeting_point` set to MeetingPoint 5

#### Scenario: Create event with both meeting and pickup point
- **WHEN** POST `/api/events/` with `{ ..., meeting_point_id: 5, pickup_point_id: 7 }`
- **THEN** the created event SHALL have both fields set

#### Scenario: Create event without meeting points
- **WHEN** POST `/api/events/` without `meeting_point_id` and `pickup_point_id`
- **THEN** both fields SHALL be null

#### Scenario: Update event meeting point
- **WHEN** PATCH `/api/events/{slug}/` with `{ meeting_point_id: 3 }`
- **THEN** the event's `meeting_point` SHALL be updated to MeetingPoint 3

#### Scenario: Remove event meeting point
- **WHEN** PATCH `/api/events/{slug}/` with `{ meeting_point_id: null }`
- **THEN** the event's `meeting_point` SHALL be set to null

### Requirement: Event detail response includes meeting point data
The event detail and list API responses SHALL include resolved MeetingPoint data for `meeting_point` and `pickup_point`.

#### Scenario: Event detail with meeting point
- **WHEN** GET `/api/events/{slug}/` for an event with `meeting_point` set
- **THEN** the response SHALL include `meeting_point: { id, name, street, zip_code, city, description, full_address }`

#### Scenario: Event detail without meeting points
- **WHEN** GET `/api/events/{slug}/` for an event with both points null
- **THEN** the response SHALL include `meeting_point: null` and `pickup_point: null`

#### Scenario: Event list includes meeting point summary
- **WHEN** GET `/api/events/` or `/api/events/my-invited/`
- **THEN** each event item SHALL include `meeting_point` and `pickup_point` (resolved or null)

### Requirement: Meeting point picker UI in event forms
The frontend SHALL provide a picker component for selecting or creating MeetingPoints when creating or editing events.

#### Scenario: Select existing meeting point during event creation
- **WHEN** user is on the event creation page (NewEventPage)
- **THEN** the form SHALL show dropdown selectors for "Treffpunkt" and "Abholpunkt"
- **THEN** the dropdowns SHALL list the user's visible MeetingPoints

#### Scenario: Create new meeting point inline during event creation
- **WHEN** user clicks "Neuen Treffpunkt anlegen" in the picker
- **THEN** a form SHALL appear to enter name, street, zip_code, city
- **THEN** upon saving, the new MeetingPoint SHALL be created and auto-selected

#### Scenario: Edit meeting points in event settings
- **WHEN** user opens the Settings tab of the event dashboard
- **THEN** the settings form SHALL include "Treffpunkt" and "Abholpunkt" selectors
- **THEN** the user SHALL be able to change or remove the assigned points

### Requirement: Participants see meeting point addresses
Invited members and registered participants SHALL see the Treffpunkt and Abholpunkt addresses on the event detail view.

#### Scenario: Member sees meeting point on event page
- **WHEN** an invited member views an event with a meeting_point set
- **THEN** the event detail page SHALL display the Treffpunkt name and full address

#### Scenario: Guest sees meeting point on registration page
- **WHEN** a guest accesses the guest registration page for an event with meeting_point set
- **THEN** the page SHALL display the Treffpunkt name and full address
