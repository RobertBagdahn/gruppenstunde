## MODIFIED Requirements

### Requirement: Event model extended with color, icon, and template fields
The Event model SHALL include `color` (CharField(20), default="blue"), `icon` (CharField(30), default="tent"), and `is_template` (BooleanField, default=False) fields. The `color` field SHALL accept only values from the predefined palette: slate, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, violet, purple, pink, rose. The `icon` field SHALL accept only values from the predefined Lucide icon set.

#### Scenario: Event created with default color and icon
- **WHEN** a new Event is created without specifying `color` or `icon`
- **THEN** the `color` field SHALL default to `"blue"`
- **THEN** the `icon` field SHALL default to `"tent"`
- **THEN** the `is_template` field SHALL default to `False`

#### Scenario: Event created with custom color and icon
- **WHEN** POST `/api/events/` with `color: "emerald"` and `icon: "flame"`
- **THEN** the Event SHALL be created with the specified color and icon
- **THEN** the values SHALL be persisted and returned in the response

#### Scenario: Event marked as template
- **WHEN** POST `/api/events/` with `is_template: true`
- **THEN** the Event SHALL be flagged as a template
- **THEN** template Events SHALL NOT appear in standard event listings (`GET /api/events/`)
- **THEN** template Events SHALL only appear via `GET /api/events/templates/`

### Requirement: Event slug is user-editable
The Event slug SHALL be auto-generated from the event name but MUST also be editable by the user. A dedicated endpoint SHALL allow checking slug availability.

#### Scenario: Slug auto-generated from name
- **WHEN** POST `/api/events/` with `name: "Sommerlager 2026"` and no `slug` field
- **THEN** the slug SHALL be auto-generated as `"sommerlager-2026"` using `slugify()`

#### Scenario: User provides a custom slug
- **WHEN** POST `/api/events/` with `slug: "sola-2026"`
- **THEN** the Event SHALL use `"sola-2026"` as its slug
- **THEN** the slug SHALL be validated for URL-safe characters (lowercase alphanumeric and hyphens only)

#### Scenario: Slug uniqueness check endpoint
- **WHEN** GET `/api/events/check-slug/?slug=sommerlager-2026`
- **THEN** the response SHALL return `{ "available": true, "suggestion": null }` if the slug is not taken
- **THEN** the response SHALL return `{ "available": false, "suggestion": "sommerlager-2026-2" }` if the slug is already taken
- **THEN** the suggestion SHALL append an incrementing number until a free slug is found

#### Scenario: Slug updated via PATCH
- **WHEN** PATCH `/api/events/{slug}/` with `slug: "new-slug"`
- **THEN** the Event slug SHALL be updated
- **THEN** if the new slug is already taken by another Event, the API SHALL return a 409 Conflict error

### Requirement: Event creation accepts group and invitation data
The Event creation endpoint SHALL optionally accept `group_id` and `invited_user_ids` to associate a group and invite users at creation time.

#### Scenario: Event created with group and invitations
- **WHEN** POST `/api/events/` with `group_id: 5` and `invited_user_ids: [10, 11, 12]`
- **THEN** the Event SHALL be associated with group 5
- **THEN** invitations SHALL be created for users 10, 11, and 12 with status `pending`
- **THEN** the response SHALL include the created Event with group and invitation data

#### Scenario: Event created without group
- **WHEN** POST `/api/events/` without `group_id` and without `invited_user_ids`
- **THEN** the Event SHALL be created without a group association
- **THEN** no invitations SHALL be created

#### Scenario: Invalid group or user IDs
- **WHEN** POST `/api/events/` with a `group_id` that does not exist or the user is not a member of
- **THEN** the API SHALL return a 400 Bad Request with error message
- **WHEN** POST `/api/events/` with `invited_user_ids` containing non-existent user IDs
- **THEN** the API SHALL return a 400 Bad Request with error message

### Requirement: EventLocation with coordinates
The EventLocation model SHALL include `latitude` (FloatField, nullable) and `longitude` (FloatField, nullable) fields for map integration.

#### Scenario: EventLocation created with coordinates
- **WHEN** POST or PATCH an EventLocation with `latitude: 48.1351` and `longitude: 11.5820`
- **THEN** the coordinates SHALL be stored on the EventLocation
- **THEN** GET `/api/events/{slug}/` SHALL include `latitude` and `longitude` in the location response

#### Scenario: EventLocation without coordinates
- **WHEN** an EventLocation is created without `latitude` and `longitude`
- **THEN** both fields SHALL default to `null`
- **THEN** the API response SHALL include `latitude: null` and `longitude: null`

### Requirement: MeetingPoint with coordinates
The MeetingPoint model SHALL include `latitude` (FloatField, nullable) and `longitude` (FloatField, nullable) fields for map integration.

#### Scenario: MeetingPoint created with coordinates
- **WHEN** POST or PATCH a MeetingPoint with `latitude: 48.2082` and `longitude: 16.3738`
- **THEN** the coordinates SHALL be stored on the MeetingPoint
- **THEN** GET `/api/events/{slug}/` SHALL include `latitude` and `longitude` in the meeting_point and pickup_point responses

#### Scenario: MeetingPoint without coordinates
- **WHEN** a MeetingPoint is created without `latitude` and `longitude`
- **THEN** both fields SHALL default to `null`
- **THEN** the API response SHALL include `latitude: null` and `longitude: null`

### Requirement: Event detail API response
The event detail API response SHALL include responsible person contact information, enhanced participant data, computed phase, role-appropriate participant statistics, meeting/pickup point data with coordinates, and the new color/icon/is_template fields.

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

#### Scenario: Event detail includes new fields
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include `color`, `icon`, and `is_template` fields
- **THEN** the response SHALL include `slug` as an editable identifier

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

#### Scenario: Event detail includes meeting and pickup points with coordinates
- **WHEN** GET `/api/events/{slug}/` for an event with `meeting_point` and/or `pickup_point` set
- **THEN** the response SHALL include `meeting_point: { id, name, street, zip_code, city, description, full_address, latitude, longitude } | null`
- **THEN** the response SHALL include `pickup_point: { id, name, street, zip_code, city, description, full_address, latitude, longitude } | null`

### Requirement: Pydantic and Zod schemas extended with new fields
The Pydantic schemas (EventOut, EventCreate, EventUpdate) and the corresponding Zod schemas SHALL be extended with the new fields. Both schema systems MUST stay in sync.

#### Scenario: EventCreate schema includes new fields
- **WHEN** the EventCreate Pydantic schema is used
- **THEN** it SHALL accept: `color` (optional, default "blue"), `icon` (optional, default "tent"), `is_template` (optional, default False), `slug` (optional), `group_id` (optional, int | None), `invited_user_ids` (optional, list[int])
- **THEN** the Zod `eventCreateSchema` SHALL mirror these fields exactly

#### Scenario: EventOut schema includes new fields
- **WHEN** the EventOut Pydantic schema is used
- **THEN** it SHALL include: `color`, `icon`, `is_template`, `slug`
- **THEN** location and meeting_point sub-schemas SHALL include `latitude` and `longitude`
- **THEN** the Zod `eventSchema` SHALL mirror these fields exactly

#### Scenario: EventUpdate schema includes new fields
- **WHEN** the EventUpdate Pydantic schema is used
- **THEN** it SHALL accept: `color` (optional), `icon` (optional), `is_template` (optional), `slug` (optional)
- **THEN** the Zod `eventUpdateSchema` SHALL mirror these fields exactly

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

### Requirement: EventColorChoices and EventIconChoices in choices.py
The event app SHALL define `EventColorChoices` and `EventIconChoices` as Django `TextChoices` classes in `choices.py`. These SHALL be used for model field validation.

#### Scenario: EventColorChoices definition
- **WHEN** the `EventColorChoices` TextChoices class is defined
- **THEN** it SHALL contain exactly 15 Tailwind color names: `slate`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `blue`, `violet`, `purple`, `pink`, `rose`
- **THEN** the Event model `color` field SHALL use `choices=EventColorChoices.choices`

#### Scenario: EventIconChoices definition
- **WHEN** the `EventIconChoices` TextChoices class is defined
- **THEN** it SHALL contain only verified Lucide icon names: `tent`, `flame`, `compass`, `map`, `mountain`, `tree`, `sun`, `moon`, `star`, `heart`, `flag`, `users`, `music`, `book`, `utensils`, `backpack`, `flashlight`, `binoculars`, `anchor`, `shield`, `award`, `crown`, `zap`, `cloud`, `snowflake`, `umbrella`, `fire`, `leaf`, `fish`, `bird`, `calendar`
- **THEN** the icon `campfire` SHALL NOT be used (it does not exist in Lucide; use `flame` instead)
- **THEN** the Event model `icon` field SHALL use `choices=EventIconChoices.choices`

### Requirement: Router route ordering for check-slug and templates
The `check-slug` and `templates` routes MUST be defined BEFORE the `/{event_slug}/` catch-all route in the Django Ninja router. Otherwise, Django will interpret `check-slug` and `templates` as event slug values and route to the wrong handler.

#### Scenario: check-slug route is reachable
- **WHEN** GET `/api/events/check-slug/?slug=test`
- **THEN** the request SHALL be handled by the check-slug endpoint, NOT by the event detail endpoint
- **THEN** this requires the route to be defined before `/{event_slug}/` in the router

#### Scenario: templates route is reachable
- **WHEN** GET `/api/events/templates/`
- **THEN** the request SHALL be handled by the templates list endpoint, NOT by the event detail endpoint
- **THEN** this requires the route to be defined before `/{event_slug}/` in the router

### Requirement: Templates excluded from event list endpoint
The `GET /api/events/` list endpoint SHALL exclude template events by default by filtering `is_template=False`.

#### Scenario: Event list excludes templates
- **WHEN** GET `/api/events/`
- **THEN** the queryset SHALL filter `is_template=False`
- **THEN** template events SHALL only be accessible via `GET /api/events/templates/`
