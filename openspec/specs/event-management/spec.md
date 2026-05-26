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

## Guest Registration

### Requirement: Guest registration confirmation email
The system SHALL send the guest registration confirmation email as an HTML email using the CI-branded registration confirmation template, consistent with the regular registration flow. The `GuestRegistrationService` SHALL use `MailService.send_registration_confirmation()` which now renders HTML with CI.

#### Scenario: Guest registration with group CI
- **WHEN** a guest registers for an event that has an invited group with CI
- **THEN** the confirmation email SHALL be rendered as HTML with the group's logo, colors, footer, and payment info

#### Scenario: Guest registration without group CI
- **WHEN** a guest registers for an event without group CI
- **THEN** the confirmation email SHALL use default Inspi styling

## Event List Redesign

### Requirement: Compact event card design
The event list page SHALL display events in compact, information-dense cards.

#### Scenario: Event card content
- **WHEN** the event list is displayed at `/events/app`
- **THEN** each event card SHALL show:
  - Event name (bold, primary text)
  - Phase badge (color-coded, e.g., green for "Anmeldephase", blue for "Vor dem Event")
  - Date range (formatted as "DD.MM. – DD.MM.YYYY" or "DD.MM.YYYY" for single-day events)
  - Location (city or location name, truncated if needed)
  - Registration status icon (checkmark if registered, empty circle if not)
- **THEN** each card SHALL link to `/events/app/{slug}`

#### Scenario: Event card phase badges
- **WHEN** a phase badge is displayed
- **THEN** the following color scheme SHALL be used:
  - `draft`: gray badge
  - `pre_registration`: yellow badge
  - `registration`: green badge
  - `pre_event`: blue badge
  - `running`: purple badge
  - `completed`: muted/gray badge

### Requirement: Full-width event list layout
The event list SHALL use full width without a sidebar detail panel.

#### Scenario: List layout on desktop
- **WHEN** the event list is viewed on desktop (>= 768px)
- **THEN** events SHALL be displayed in a responsive grid (2-3 columns)
- **THEN** the "Neues Event" button SHALL be displayed prominently at the top

#### Scenario: List layout on mobile
- **WHEN** the event list is viewed on mobile (< 768px)
- **THEN** events SHALL be displayed in a single column
- **THEN** cards SHALL use full width with minimal padding

### Requirement: Remove sidebar detail panel
The inline detail panel in the event list page SHALL be removed.

#### Scenario: Event click navigates to detail page
- **WHEN** a user clicks an event card on the list page
- **THEN** the browser SHALL navigate to `/events/app/{slug}`
- **THEN** no inline detail panel SHALL be shown on the list page

### Requirement: User registration status in event list
The event list API SHALL include the user's registration status and personal invitation status for each event.

#### Scenario: Registration status in list response
- **WHEN** GET `/api/events/` by an authenticated user
- **THEN** each event in the response SHALL include `is_registered: boolean`
- **WHEN** the user is not authenticated
- **THEN** `is_registered` SHALL be `false` for all events

#### Scenario: Personal invitation status in list response
- **WHEN** GET `/api/events/` by an authenticated user
- **THEN** each event in the response SHALL include `is_invited: boolean`
- **AND** `is_invited` SHALL be `true` if the user is in `Event.invited_users` OR belongs (via `GroupMembership`) to any group in `Event.invited_groups`
- **AND** `is_invited` SHALL be `false` if the user is only a manager (`responsible_persons` / `created_by`) without being personally invited
- **WHEN** the user is not authenticated
- **THEN** `is_invited` SHALL be `false` for all events

#### Scenario: Schema synchronization
- **WHEN** the backend Pydantic `EventListOut` schema is updated with `is_invited`
- **THEN** the frontend Zod schema in `frontend/src/schemas/event.ts` SHALL be updated in the same commit to keep parity

### Requirement: Event card status badge with invitation priority
The event card component in the frontend SHALL render at most one status badge per card. The visible badge SHALL be determined by the following priority rules (highest wins):

1. `is_registered = true` → badge "Angemeldet" (green, icon `check_circle`)
2. `is_invited = true` AND `is_registered = false` AND `phase ∈ { pre_registration, registration }` → badge "Anmeldung steht aus" (amber, icon `pending_actions`)
3. `is_invited = false` AND `is_registered = false` AND `phase = registration` → badge "Anmeldung offen" (violet, icon `app_registration`)
4. otherwise → no status badge (the phase badge remains separately)

#### Scenario: Registered user sees Angemeldet badge
- **WHEN** `is_registered = true`
- **THEN** the card SHALL show only the "Angemeldet" badge regardless of `is_invited` or `phase`

#### Scenario: Invited but not registered user during registration phase
- **WHEN** `is_registered = false` AND `is_invited = true` AND `phase = registration`
- **THEN** the card SHALL show the "Anmeldung steht aus" badge (amber)

#### Scenario: Invited but not registered user during pre-registration phase
- **WHEN** `is_registered = false` AND `is_invited = true` AND `phase = pre_registration`
- **THEN** the card SHALL show the "Anmeldung steht aus" badge (amber)

#### Scenario: Public event during registration, user not invited
- **WHEN** `is_registered = false` AND `is_invited = false` AND `phase = registration`
- **THEN** the card SHALL show the "Anmeldung offen" badge (violet)

#### Scenario: No applicable status
- **WHEN** `is_registered = false` AND `phase ∉ { pre_registration, registration }`
- **AND** `is_invited = false`
- **THEN** the card SHALL NOT show any status badge (only the phase badge remains)

## Invitation Status

### Requirement: Invitation status list API
The system SHALL provide an API endpoint to list all invited users with their response status.

#### Scenario: List invitations for an event
- **WHEN** GET `/api/events/{slug}/invitations/`
- **AND** the requesting user is a manager
- **THEN** the response SHALL be a paginated list of invited users
- **THEN** each entry SHALL include: `user_id`, `first_name`, `last_name`, `email`, `scout_name`, `status` (accepted/pending), `invited_via` (direct/group), `group_name` (if invited via group)
- **THEN** the response SHALL use standard pagination format: `{ items, total, page, page_size, total_pages }`

#### Scenario: Status determination
- **WHEN** the system determines a user's invitation status
- **AND** the user has a Registration record for this event
- **THEN** the status SHALL be `accepted`
- **WHEN** the user does NOT have a Registration record
- **THEN** the status SHALL be `pending`

#### Scenario: Filter by status
- **WHEN** GET `/api/events/{slug}/invitations/?status=accepted`
- **THEN** only users with status `accepted` SHALL be returned
- **WHEN** GET `/api/events/{slug}/invitations/?status=pending`
- **THEN** only users with status `pending` SHALL be returned

#### Scenario: Search invitations
- **WHEN** GET `/api/events/{slug}/invitations/?search=Max`
- **THEN** the response SHALL filter by first_name, last_name, scout_name, or email

#### Scenario: Non-manager access
- **WHEN** a non-manager user requests GET `/api/events/{slug}/invitations/`
- **THEN** the system SHALL return HTTP 403

### Requirement: Invitation status frontend view
The frontend SHALL display the invitation status list in the admin "Eingeladene" tab.

#### Scenario: Invitations tab displays all invited users
- **WHEN** a manager views the "Eingeladene" tab
- **THEN** a list of all invited users SHALL be displayed
- **THEN** each entry SHALL show: name, email, status badge (color-coded), invited via (direct or group name)
- **THEN** status badges SHALL use: green for "Zugesagt", gray for "Offen"

#### Scenario: Filter by status
- **WHEN** the manager selects a status filter
- **THEN** the list SHALL filter to show only users with the selected status
- **THEN** filter buttons SHALL show counts: "Alle (25)", "Zugesagt (15)", "Offen (10)"

#### Scenario: Search in invitations
- **WHEN** the manager types in the search field
- **THEN** the list SHALL filter by name or email in real-time

### Requirement: Invitation count in event detail
The event detail API SHALL include invitation status counts.

#### Scenario: Counts in event detail
- **WHEN** GET `/api/events/{slug}/` by a manager
- **THEN** the response SHALL include `invitation_counts`: `{ total, accepted, pending }`
- **WHEN** the requesting user is a member (not manager)
- **THEN** `invitation_counts` SHALL NOT be included in the response

## Checklist

### Requirement: Publish readiness checklist API
A `GET /api/events/{slug}/checklist/` endpoint SHALL return the current checklist state for the event.

#### Scenario: Checklist response structure
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the response SHALL include a `required` list and an `optional` list
- **THEN** each item SHALL have: `key` (string), `label` (string, German), `is_complete` (boolean), `link` (string, relative path to relevant setting/tab)
- **THEN** the response SHALL include `progress` (float, 0.0–1.0) computed from required items only

#### Scenario: Required checklist items
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the `required` list SHALL contain exactly these items:
  1. `name_set` — "Name ist gesetzt" (complete when event name is non-empty)
  2. `dates_set` — "Start- und Enddatum sind gesetzt" (complete when both `start_date` and `end_date` are non-null)
  3. `booking_option_exists` — "Mindestens eine Buchungsoption vorhanden" (complete when at least one BookingOption exists)
  4. `registration_start_set` — "Anmeldebeginn ist konfiguriert" (complete when `registration_start` is non-null)
  5. `location_or_description` — "Ort oder Beschreibung vorhanden" (complete when `location` is non-null OR `description` is non-empty)

#### Scenario: Optional checklist items
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the `optional` list SHALL contain these items:
  1. `invitation_text_written` — "Einladungstext ist geschrieben" (complete when `invitation_text` is non-empty)
  2. `invitees_added` — "Mindestens eine Gruppe oder Person eingeladen" (complete when at least one invitation exists)
  3. `packing_list_assigned` — "Packliste ist zugewiesen" (complete when a packing list is linked to the event)

#### Scenario: Only managers can access checklist
- **WHEN** GET `/api/events/{slug}/checklist/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Checklist is informational only
The checklist SHALL be purely informational and SHALL NOT block any actions such as publishing or transitioning phases.

#### Scenario: Incomplete checklist does not block publish
- **WHEN** a manager publishes an event with incomplete required checklist items
- **THEN** the publish action SHALL succeed regardless of checklist state

### Requirement: Checklist card in overview tab
The event overview tab SHALL display a checklist Card component showing the readiness state.

#### Scenario: Checklist card with progress bar
- **WHEN** a manager views the event overview tab
- **THEN** a "Veröffentlichungs-Checkliste" card SHALL be displayed
- **THEN** the card SHALL show a progress bar indicating the completion percentage of required items

#### Scenario: Required items display
- **WHEN** a manager views the checklist card
- **THEN** each required item SHALL be displayed with a green checkmark icon if complete or a red circle icon if incomplete
- **THEN** each incomplete item SHALL be a clickable link navigating to the relevant setting or tab

#### Scenario: Optional items display
- **WHEN** a manager views the checklist card
- **THEN** optional items SHALL be displayed below the required items with a yellow/info indicator if incomplete
- **THEN** complete optional items SHALL show a green checkmark icon

#### Scenario: All items complete
- **WHEN** all required items are complete
- **THEN** the progress bar SHALL show 100%
- **THEN** an additional text "Bereit zur Veröffentlichung" SHALL be displayed

#### Scenario: Checklist not shown to non-managers
- **WHEN** a non-manager views the event overview tab
- **THEN** the checklist card SHALL NOT be displayed

## Statistics

### Requirement: Event statistics endpoint
The system SHALL provide a statistics endpoint returning aggregated KPIs for an event.

#### Scenario: Retrieve event statistics
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the system SHALL return a JSON object with all computed statistics

#### Scenario: Stats require manager permission
- **WHEN** a non-manager user requests GET `/api/events/{slug}/stats/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Capacity statistics
The statistics SHALL include booking capacity information.

#### Scenario: Capacity KPIs
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include for each booking option: name, max_participants, current_count, fill_percentage
- **THEN** the response SHALL include total: total_capacity (sum of all max), total_registered, total_fill_percentage

### Requirement: Payment statistics
The statistics SHALL include payment overview information.

#### Scenario: Payment KPIs
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include: total_expected (sum of all booking option prices), total_received (sum of all payments), total_outstanding (expected - received), paid_count, unpaid_count, paid_percentage
- **THEN** the response SHALL include payment_by_method: list of {method, count, total_amount}

### Requirement: Demographic statistics
The statistics SHALL include participant demographics.

#### Scenario: Gender distribution
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include gender_distribution: list of {gender, count, percentage}

#### Scenario: Age distribution
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include age_distribution: list of {age_group (e.g., "6-10", "11-14", "15-18", "19+"), count, percentage}
- **THEN** age SHALL be calculated relative to the event start_date (or today if no start_date)

### Requirement: Nutrition statistics
The statistics SHALL include dietary requirement summaries.

#### Scenario: Nutritional tags overview
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include nutritional_summary: list of {tag_name, count} for all nutritional tags used by participants

### Requirement: Registration timeline chart data
The statistics SHALL include registration-over-time data for chart rendering.

#### Scenario: Registration timeline
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include registration_timeline: list of {date, cumulative_count} showing how registrations grew over time
- **THEN** dates SHALL be grouped by day

### Requirement: Statistics frontend dashboard
The frontend SHALL display statistics as visual cards and charts.

#### Scenario: Stats view in dashboard
- **WHEN** the manager views the Übersicht tab
- **THEN** KPI cards SHALL show: Teilnehmer (count/capacity), Bezahlt (percentage), Einnahmen (amount)
- **THEN** a bar chart or donut chart SHALL show gender distribution
- **THEN** a bar chart SHALL show age distribution
- **THEN** a line chart SHALL show registration timeline
- **THEN** a list SHALL show nutritional requirements with counts

## Export

### Requirement: Export configuration
The system SHALL allow managers to configure which columns to include in an export and which format to use.

#### Scenario: Export with column selection
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: ["first_name", "last_name", "email", "booking_option", "is_paid"]}`
- **THEN** the system SHALL return a file containing only the selected columns

#### Scenario: Export all available columns
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "csv", columns: ["all"]}`
- **THEN** the system SHALL include all standard columns plus custom field values and labels

### Requirement: Export formats
The system SHALL support three export formats: Excel (.xlsx), CSV (.csv), and PDF (.pdf).

#### Scenario: Excel export
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...]}`
- **THEN** the response SHALL be an .xlsx file with Content-Disposition header
- **THEN** the first row SHALL contain column headers in German

#### Scenario: CSV export
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "csv", columns: [...]}`
- **THEN** the response SHALL be a .csv file with UTF-8-BOM encoding (for Excel compatibility)
- **THEN** the delimiter SHALL be semicolon (;) for German locale compatibility

#### Scenario: PDF export (checklist)
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "pdf", columns: [...]}`
- **THEN** the response SHALL be a .pdf file formatted as a printable checklist
- **THEN** each row SHALL have a checkbox column for manual checking

### Requirement: Available export columns
The system SHALL support the following columns for export: `first_name`, `last_name`, `scout_name`, `email`, `birthday`, `age` (computed), `gender`, `address`, `zip_code`, `city`, `booking_option`, `is_paid`, `total_paid`, `remaining_amount`, `payment_method` (method of the most recent payment by received_at), `nutritional_tags`, `labels`, and all custom field values (dynamically).

#### Scenario: Available columns endpoint
- **WHEN** GET `/api/events/{slug}/export/columns/`
- **THEN** the system SHALL return a list of available columns with id, label (German), and type (standard/custom_field/computed)

### Requirement: Export with filters
The system SHALL allow applying participant filters to the export.

#### Scenario: Export only paid participants
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {is_paid: true}}`
- **THEN** the export SHALL only contain participants where is_paid is true

#### Scenario: Export by booking option
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {booking_option_id: 5}}`
- **THEN** the export SHALL only contain participants with that booking option

#### Scenario: Export by label
- **WHEN** POST `/api/events/{slug}/export/` with `{format: "excel", columns: [...], filters: {label_id: 3}}`
- **THEN** the export SHALL only contain participants with that label

### Requirement: Export requires manager permission
Only event managers SHALL be able to export participant data.

#### Scenario: Non-manager export attempt
- **WHEN** a non-manager user requests POST `/api/events/{slug}/export/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Export frontend dialog
The frontend SHALL provide an export dialog with column selection, format choice, and filter options.

#### Scenario: Export dialog UI
- **WHEN** the manager clicks "Exportieren" in the Exporte tab
- **THEN** a dialog SHALL appear with checkboxes for each available column
- **THEN** a format selector (Excel/CSV/PDF) SHALL be shown
- **THEN** optional filter dropdowns (Bezahlt, Buchungsoption, Label) SHALL be available
- **THEN** a "Herunterladen" button SHALL trigger the download

## Timeline

### Requirement: Timeline Entry Model
The system SHALL store a `TimelineEntry` for every significant action related to an event's participants. Each entry SHALL contain: event (FK), participant (FK, nullable), user (FK, nullable — the actor), action_type (CharField with choices), description (TextField), metadata (JSONField), created_at (auto timestamp).

#### Scenario: Timeline entry created on registration
- **WHEN** a participant is registered for an event via POST `/api/events/{slug}/register/`
- **THEN** the system SHALL create a TimelineEntry with action_type `registered`
- **THEN** the description SHALL contain the participant's full name and booking option

#### Scenario: Timeline entry created on unregistration
- **WHEN** a participant is removed via DELETE `/api/events/{slug}/participants/{id}/`
- **THEN** the system SHALL create a TimelineEntry with action_type `unregistered`
- **THEN** the description SHALL contain the participant's full name

#### Scenario: Timeline entry created on payment
- **WHEN** a payment is recorded via POST `/api/events/{slug}/payments/`
- **THEN** the system SHALL create a TimelineEntry with action_type `payment_received`
- **THEN** the metadata SHALL include payment amount, method, and location

#### Scenario: Timeline entry created on payment removal
- **WHEN** a payment is deleted via DELETE `/api/events/{slug}/payments/{id}/`
- **THEN** the system SHALL create a TimelineEntry with action_type `payment_removed`

### Requirement: Timeline API endpoint
The system SHALL provide a paginated timeline endpoint for event managers.

#### Scenario: List event timeline
- **WHEN** GET `/api/events/{slug}/timeline/?page=1&page-size=20`
- **THEN** the system SHALL return a paginated list of TimelineEntry records
- **THEN** entries SHALL be ordered by `created_at` descending (newest first)
- **THEN** each entry SHALL include: id, action_type, description, metadata, user (name + email if available), participant (name if available), created_at

#### Scenario: Timeline requires manager permission
- **WHEN** a non-manager user requests GET `/api/events/{slug}/timeline/`
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Filter timeline by participant
- **WHEN** GET `/api/events/{slug}/timeline/?participant-id={id}`
- **THEN** the system SHALL return only entries for that specific participant

#### Scenario: Filter timeline by action type
- **WHEN** GET `/api/events/{slug}/timeline/?action-type=payment_received`
- **THEN** the system SHALL return only entries of that action type

### Requirement: Timeline action types
The system SHALL support the following action_type values: `registered`, `unregistered`, `payment_received`, `payment_removed`, `booking_changed`, `label_added`, `label_removed`, `custom_field_updated`, `mail_sent`, `participant_updated`.

#### Scenario: All action types are valid
- **WHEN** a TimelineEntry is created with any of the defined action types
- **THEN** the entry SHALL be saved successfully

#### Scenario: Invalid action type rejected
- **WHEN** a TimelineEntry is created with an undefined action_type
- **THEN** the system SHALL raise a validation error

### Requirement: Timeline entries for mail actions
The system SHALL create timeline entries when mails are sent to participants.

#### Scenario: Rundmail sent
- **WHEN** a mail is sent via POST `/api/events/{slug}/send-mail/`
- **THEN** the system SHALL create a TimelineEntry with action_type `mail_sent` for each recipient participant
- **THEN** the metadata SHALL include the mail subject

### Requirement: Timeline Frontend display
The frontend SHALL display the timeline as a vertical chronological list with action-type-specific icons and colors.

#### Scenario: Timeline view in dashboard
- **WHEN** the manager views the Timeline tab in the event dashboard
- **THEN** the system SHALL show a chronological list with date grouping
- **THEN** each entry SHALL show an icon (based on action_type), description, actor name, and timestamp
- **THEN** entries SHALL be loadable via "Mehr laden" button (paginated)

## Labels

### Requirement: Participant Label model
The system SHALL store labels per event as a `ParticipantLabel` model with: event (FK), name (CharField, max 50), color (CharField, max 7 — hex color code e.g. "#FF5733"), created_at (auto timestamp). Participants SHALL have a M2M relation to ParticipantLabel.

#### Scenario: Create a label
- **WHEN** POST `/api/events/{slug}/labels/` with `{name: "Zelt A", color: "#4CAF50"}`
- **THEN** a ParticipantLabel record SHALL be created for the event

#### Scenario: Labels are event-scoped
- **WHEN** labels are created for event A
- **THEN** they SHALL NOT be visible in event B

### Requirement: Label CRUD API
The system SHALL provide CRUD endpoints for labels.

#### Scenario: List labels for an event
- **WHEN** GET `/api/events/{slug}/labels/`
- **THEN** the system SHALL return all labels for the event, ordered by name

#### Scenario: Update a label
- **WHEN** PATCH `/api/events/{slug}/labels/{id}/` with `{name: "Zelt B", color: "#2196F3"}`
- **THEN** the label SHALL be updated

#### Scenario: Delete a label
- **WHEN** DELETE `/api/events/{slug}/labels/{id}/`
- **THEN** the label SHALL be deleted and removed from all participants

#### Scenario: Labels require manager permission
- **WHEN** a non-manager user attempts to create/update/delete labels
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Assign labels to participants
The system SHALL allow managers to assign and remove labels from participants.

#### Scenario: Assign a label to a participant
- **WHEN** POST `/api/events/{slug}/participants/{id}/labels/` with `{label_id: 3}`
- **THEN** the label SHALL be added to the participant's labels M2M relation
- **THEN** a TimelineEntry with action_type `label_added` SHALL be created

#### Scenario: Remove a label from a participant
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/labels/{label_id}/`
- **THEN** the label SHALL be removed from the participant's labels
- **THEN** a TimelineEntry with action_type `label_removed` SHALL be created

#### Scenario: Assign already assigned label
- **WHEN** POST `/api/events/{slug}/participants/{id}/labels/` with a label_id that is already assigned
- **THEN** the system SHALL return 200 (idempotent, no duplicate)

### Requirement: Labels in participant list
The participant list SHALL include label information.

#### Scenario: Participant response includes labels
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include a `labels` array with {id, name, color}

### Requirement: Filter participants by label
The participant list SHALL be filterable by label.

#### Scenario: Filter by label
- **WHEN** GET `/api/events/{slug}/participants/?label-id=3`
- **THEN** the system SHALL return only participants that have the specified label

### Requirement: Labels in frontend
The frontend SHALL display labels as colored badges on participants and provide a label management UI.

#### Scenario: Label badges in participant list
- **WHEN** the manager views the Teilnehmer tab
- **THEN** each participant row SHALL show their assigned labels as small colored badges

#### Scenario: Quick label assignment
- **WHEN** the manager clicks on a participant's label area
- **THEN** a dropdown SHALL appear showing all available labels with checkboxes
- **THEN** toggling a checkbox SHALL immediately assign/remove the label

#### Scenario: Label management in settings
- **WHEN** the manager views the Einstellungen tab
- **THEN** a label management section SHALL allow creating, editing (name + color), and deleting labels

## QR Code

### Requirement: Client-side QR code generation
QR codes for event registration links SHALL be generated client-side using the `qrcode.react` library.

#### Scenario: QR code renders registration URL
- **WHEN** a QR code component is rendered for an event with slug `summer-camp-2026`
- **THEN** the QR code SHALL encode the URL `https://gruppenstunde.de/events/summer-camp-2026/register`
- **THEN** the QR code SHALL be rendered as an SVG element by default

#### Scenario: QR code is scannable
- **WHEN** the generated QR code is scanned with a mobile device
- **THEN** the device SHALL open the event registration page at the encoded URL

### Requirement: Printable QR code page
A standalone printable page SHALL display the event QR code with event details, accessible from the event dashboard.

#### Scenario: Access printable QR page from dashboard
- **WHEN** a manager views the event dashboard
- **THEN** a "QR-Code anzeigen" button SHALL be available (in the "Einladung & Gäste" tab or overview)
- **THEN** clicking the button SHALL open a new route or print-optimized view

#### Scenario: Printable page layout
- **WHEN** the printable QR code page is displayed
- **THEN** the page SHALL contain:
  - The event name as a heading
  - The event date range (formatted as "DD.MM.YYYY – DD.MM.YYYY")
  - The event location name (if set)
  - The QR code (minimum 200x200px)
  - The registration URL as plain text below the QR code
- **THEN** the layout SHALL be centered and optimized for A4 print

#### Scenario: Print via browser
- **WHEN** a user triggers the browser print function (Ctrl+P / Cmd+P) on the printable QR page
- **THEN** the page SHALL render cleanly without navigation, headers, or footers
- **THEN** CSS `@media print` rules SHALL hide non-essential UI elements

### Requirement: Download QR code as PNG
Users SHALL be able to download the QR code as a PNG image file.

#### Scenario: Download button
- **WHEN** a manager views the printable QR code page
- **THEN** a "Als PNG herunterladen" button SHALL be displayed
- **THEN** the button SHALL NOT appear when printing (hidden via `@media print`)

#### Scenario: PNG download execution
- **WHEN** a user clicks "Als PNG herunterladen"
- **THEN** the QR code SHALL be rendered to a canvas element and exported as a PNG file
- **THEN** the downloaded file SHALL be named `{event_slug}-qr-code.png`
- **THEN** the PNG SHALL have a resolution of at least 1024x1024 pixels for high-quality printing

### Requirement: QR code in invitation PDF
The existing invitation PDF service (`backend/event/services/invitation_pdf.py`) SHALL support embedding the event QR code.

#### Scenario: QR code included in PDF
- **WHEN** an invitation PDF is generated for an event
- **THEN** the PDF SHALL include a QR code image encoding the registration URL `https://gruppenstunde.de/events/{slug}/register`
- **THEN** the QR code SHALL be placed at the bottom of the invitation, before any footer
- **THEN** the QR code SHALL be sized at 4cm x 4cm

#### Scenario: QR code generation in backend
- **WHEN** the invitation PDF service generates a QR code
- **THEN** it SHALL use the `qrcode` Python library (server-side) to generate the QR image
- **THEN** the image SHALL be generated as an in-memory PNG and embedded via ReportLab's `Image` flowable

#### Scenario: Registration URL text below QR
- **WHEN** the QR code is embedded in the PDF
- **THEN** the text "Anmeldung: https://gruppenstunde.de/events/{slug}/register" SHALL be printed below the QR code in a smaller font size

### Requirement: QR code for events without registration URL
The QR code feature SHALL handle edge cases gracefully.

#### Scenario: Event in draft phase
- **WHEN** a manager views the QR code page for an event in draft phase
- **THEN** the QR code SHALL still be generated with the registration URL
- **THEN** a notice SHALL be displayed: "Hinweis: Dieses Event ist noch nicht veröffentlicht. Der QR-Code funktioniert erst nach Veröffentlichung."

#### Scenario: Event without start date
- **WHEN** the printable QR page is displayed for an event without a start_date
- **THEN** the date field SHALL display "Datum noch nicht festgelegt"
- **THEN** the QR code SHALL still be rendered normally

## Custom Fields

### Requirement: Custom Field definition model
The system SHALL store custom field definitions per event as a `CustomField` model with: event (FK), label (CharField — the question text), field_type (CharField choices: text, select, checkbox, date, number), options (JSONField — list of strings for select fields, null otherwise), is_required (BooleanField), sort_order (IntegerField), created_at (auto timestamp).

#### Scenario: Create a text custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Kann dein Kind schwimmen?", field_type: "text", is_required: false}`
- **THEN** a CustomField record SHALL be created for the event

#### Scenario: Create a select custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "T-Shirt Größe", field_type: "select", options: ["S", "M", "L", "XL"], is_required: true}`
- **THEN** a CustomField record SHALL be created with the options stored as JSON array

#### Scenario: Create a checkbox custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Einverständnis Fotos", field_type: "checkbox", is_required: true}`
- **THEN** a CustomField record SHALL be created

#### Scenario: Create a date custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Letzter Tetanus-Impfung", field_type: "date", is_required: false}`
- **THEN** a CustomField record SHALL be created

#### Scenario: Create a number custom field
- **WHEN** POST `/api/events/{slug}/custom-fields/` with `{label: "Schuhgröße", field_type: "number", is_required: false}`
- **THEN** a CustomField record SHALL be created

### Requirement: Custom Field CRUD API
The system SHALL provide CRUD endpoints for custom field definitions.

#### Scenario: List custom fields for an event
- **WHEN** GET `/api/events/{slug}/custom-fields/`
- **THEN** the system SHALL return all custom fields for the event, ordered by sort_order

#### Scenario: Update a custom field
- **WHEN** PATCH `/api/events/{slug}/custom-fields/{id}/` with `{label: "Updated question"}`
- **THEN** the custom field SHALL be updated

#### Scenario: Delete a custom field
- **WHEN** DELETE `/api/events/{slug}/custom-fields/{id}/`
- **THEN** the custom field and all associated values SHALL be deleted (CASCADE)

#### Scenario: Custom fields require manager permission
- **WHEN** a non-manager user attempts to create/update/delete custom fields
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Custom Field Value storage
The system SHALL store participant answers as `CustomFieldValue` model with: custom_field (FK), participant (FK), value (TextField).

#### Scenario: Set custom field values for a participant
- **WHEN** PATCH `/api/events/{slug}/participants/{id}/custom-fields/` with `{values: [{custom_field_id: 1, value: "Ja"}, {custom_field_id: 2, value: "M"}]}`
- **THEN** CustomFieldValue records SHALL be created or updated for each field
- **THEN** for checkbox fields, "true"/"false" strings SHALL be used

#### Scenario: Validate required custom fields
- **WHEN** a required custom field has no value set for a participant
- **THEN** the system SHALL NOT enforce this at the API level (manager can fill in later)

#### Scenario: Validate select field value
- **WHEN** a value is set for a select custom field
- **THEN** the system SHALL validate that the value is one of the defined options

### Requirement: Custom fields in registration flow
Custom fields SHALL be visible during participant registration so values can be filled in.

#### Scenario: Custom fields shown in registration form
- **WHEN** the registration form is displayed for an event with custom fields
- **THEN** each custom field SHALL be rendered as the appropriate input type (text input, dropdown, checkbox, date picker, number input)
- **THEN** required fields SHALL be marked with an asterisk (*)

### Requirement: Custom fields in participant detail
Custom field values SHALL be displayed in the participant detail view and be editable by managers.

#### Scenario: View custom field values
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include a `custom_field_values` array with {custom_field_id, label, field_type, value}

### Requirement: Custom fields in exports
Custom field values SHALL be available as export columns.

#### Scenario: Export with custom fields
- **WHEN** POST `/api/events/{slug}/export/` with columns including a custom field id
- **THEN** the export SHALL include a column with the custom field label as header and participant values as rows

## Registration Lifecycle

### Requirement: Soft-delete for registrations
The system SHALL support soft-deletion of registrations with a reason, preserving the data for audit purposes.

#### Scenario: Soft-delete a registration
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` is called
- **THEN** the system SHALL set `deleted_at` to the current timestamp
- **THEN** the system SHALL set `deleted_by` to the requesting user
- **THEN** the system SHALL NOT hard-delete the Registration or Participant records
- **THEN** the API SHALL return HTTP 204

#### Scenario: Soft-delete with reason
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` is called with body `{ reason: "cancel" }`
- **THEN** the system SHALL store the reason in `deleted_reason`
- **THEN** valid reasons SHALL be: `duplicate`, `error`, `cancel`, `other`
- **THEN** if no reason is provided, the default SHALL be `cancel`

#### Scenario: Soft-deleted participants are hidden from normal queries
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** participants belonging to soft-deleted registrations SHALL NOT be included
- **THEN** participant counts and statistics SHALL NOT include soft-deleted registrations

#### Scenario: Timeline entry for soft-delete
- **WHEN** a participant is soft-deleted
- **THEN** a TimelineEntry with action_type `unregistered` SHALL be created
- **THEN** the metadata SHALL include the deletion reason

### Requirement: Inline person creation for admin registration
The admin registration endpoint SHALL accept inline person data without requiring a pre-existing Person record.

#### Scenario: Admin registration with inline person data
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_data: { first_name, last_name, email, ... }, booking_option_id }] }`
- **THEN** the system SHALL create a new Person record linked to a user (determined by email or created)
- **THEN** the system SHALL create a Participant from the new Person
- **THEN** the API SHALL return HTTP 201

#### Scenario: Admin registration with existing person ID
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_id: 123, booking_option_id }] }`
- **THEN** the existing behavior SHALL be preserved (use existing Person)

#### Scenario: Admin registration with mixed input
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_id: 123, booking_option_id: 1 }, { person_data: { first_name: "Max", last_name: "Muster" }, booking_option_id: 2 }] }`
- **THEN** the system SHALL handle both types in a single request

#### Scenario: Admin can select any booking option
- **WHEN** an organizer registers via `register-admin`
- **THEN** the organizer SHALL be able to select any BookingOption including: system options, expired options (past `bookable_till`), and full options
- **THEN** no availability or capacity checks SHALL be applied for admin registrations

### Requirement: Admin can manage all registrations
Organizers SHALL be able to fully edit and remove any participant's registration.

#### Scenario: Admin updates any participant
- **WHEN** PATCH `/api/events/{slug}/participants/{id}/` by a manager
- **THEN** the manager SHALL be able to update any field including booking_option
- **THEN** a TimelineEntry SHALL be created

#### Scenario: Admin removes any participant
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` by a manager
- **THEN** the participant SHALL be soft-deleted
- **THEN** the manager SHALL be able to remove any participant (not just their own)

### Requirement: Confirmation email on registration
The system SHALL send a confirmation email after every successful registration.

#### Scenario: Confirmation email for authenticated registration
- **WHEN** a user registers via `POST /api/events/{slug}/register/`
- **THEN** a confirmation email SHALL be sent to the user's email address
- **THEN** the email SHALL contain: event name, registered persons with booking options, event dates, location

#### Scenario: Confirmation email for admin registration
- **WHEN** an organizer registers a participant via `POST /api/events/{slug}/register-admin/`
- **AND** the participant has an email address
- **THEN** a confirmation email SHALL be sent to the participant's email address

#### Scenario: No confirmation email without email
- **WHEN** a participant is registered without an email address
- **THEN** no confirmation email SHALL be sent
- **THEN** the registration SHALL still succeed

## Meal Plan Link

### Requirement: MealPlan foreign key on Event model
The Event model SHALL have an optional foreign key linking to a meal plan.

#### Scenario: meal_plan field definition
- **WHEN** the Event model is defined
- **THEN** it SHALL include a `meal_plan` field with the following properties:
  - ForeignKey to `"planner.MealEvent"` (Django string reference to avoid circular imports)
  - `null=True`, `blank=True`
  - `on_delete=models.SET_NULL`
  - `related_name="events"`

#### Scenario: Migration does not break existing events
- **WHEN** the migration for the `meal_plan` field is applied
- **THEN** all existing Event records SHALL have `meal_plan` set to `NULL`

### Requirement: Pydantic schema for meal plan link
The Event Pydantic schemas SHALL expose the meal plan association.

#### Scenario: meal_plan_id in EventIn schema
- **WHEN** the EventIn (input) schema is defined
- **THEN** it SHALL include `meal_plan_id` as `Optional[int]` with default `None`

#### Scenario: meal_plan in EventOut schema
- **WHEN** the EventOut (output) schema is defined
- **THEN** it SHALL include a nested `meal_plan` object with fields: `id` (int), `title` (str), `created_at` (datetime)
- **THEN** `meal_plan` SHALL be `None` when no meal plan is linked

### Requirement: Link meal plan via API
The existing Event PATCH endpoint SHALL support linking and unlinking a meal plan.

#### Scenario: Link a meal plan to an event
- **WHEN** PATCH `/api/events/{slug}/` with body `{meal_plan_id: 42}`
- **THEN** the Event's `meal_plan` field SHALL be set to the MealEvent with id 42
- **THEN** the response SHALL return 200 OK with the updated event data including the meal plan

#### Scenario: Unlink a meal plan from an event
- **WHEN** PATCH `/api/events/{slug}/` with body `{meal_plan_id: null}`
- **THEN** the Event's `meal_plan` field SHALL be set to `NULL`
- **THEN** the response SHALL return 200 OK

#### Scenario: Link to non-existent meal plan
- **WHEN** PATCH `/api/events/{slug}/` with a `meal_plan_id` that does not exist
- **THEN** the response SHALL return 404 Not Found with message "Essensplan nicht gefunden."

#### Scenario: Only managers can link meal plans
- **WHEN** a non-manager attempts to PATCH the event with a `meal_plan_id`
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Meal plan link UI in Settings tab
The Settings tab SHALL provide a control to link or unlink a meal plan.

#### Scenario: Link button when no meal plan is linked
- **WHEN** a manager views the Settings tab and no meal plan is linked
- **THEN** an "Essensplan verknüpfen" button SHALL be displayed

#### Scenario: Select existing meal plan
- **WHEN** a manager clicks "Essensplan verknüpfen"
- **THEN** a dialog SHALL open showing a list of existing MealEvents for selection
- **THEN** each item SHALL display the meal plan title and creation date

#### Scenario: Create new meal plan from dialog
- **WHEN** a manager opens the meal plan link dialog
- **THEN** a "Neuen Essensplan erstellen" option SHALL be available
- **THEN** selecting this option SHALL navigate to the meal plan creation page and return the user to link the newly created plan

#### Scenario: Unlink existing meal plan
- **WHEN** a manager views the Settings tab and a meal plan is already linked
- **THEN** the linked meal plan title SHALL be displayed with a "Verknüpfung entfernen" button
- **THEN** clicking the button SHALL set `meal_plan_id` to `null` via the PATCH endpoint

### Requirement: Meal plan summary in Overview tab
The Overview tab SHALL display a summary card when a meal plan is linked.

#### Scenario: Meal plan card display
- **WHEN** a manager views the Overview tab and a meal plan is linked
- **THEN** an "Essensplan" card SHALL be displayed showing the meal plan title

#### Scenario: Link to full meal plan page
- **WHEN** a manager views the meal plan card in the Overview tab
- **THEN** the card SHALL contain a link to `/planning/meal-plans/{id}` opening the full meal plan detail page

#### Scenario: No meal plan card when unlinked
- **WHEN** a manager views the Overview tab and no meal plan is linked
- **THEN** the "Essensplan" card SHALL NOT be displayed

## Calendar View

### Requirement: Calendar view toggle on event landing page
The event landing page SHALL support a calendar view as an alternative to the list view.

#### Scenario: View mode toggle
- **WHEN** a user visits the event landing page
- **THEN** a toggle control SHALL be displayed with options "Liste" and "Kalender"
- **THEN** the active view mode SHALL be determined by the URL parameter `?view=list` or `?view=calendar`
- **THEN** the default view SHALL be `list` when no parameter is present

#### Scenario: URL-driven state persistence
- **WHEN** a user switches between list and calendar views
- **THEN** the URL parameter `?view=` SHALL be updated without a full page reload
- **THEN** reloading the page SHALL restore the selected view mode from the URL

### Requirement: Month grid calendar display
The calendar view SHALL render a month grid using CSS Grid (no external calendar library).

#### Scenario: Month grid layout
- **WHEN** the calendar view is displayed
- **THEN** a 7-column CSS Grid SHALL render the days of the current month
- **THEN** column headers SHALL display abbreviated German day names: "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"
- **THEN** the grid SHALL start on Monday (ISO week standard)

#### Scenario: Days outside current month
- **WHEN** the month grid is rendered
- **THEN** leading and trailing days from adjacent months SHALL be displayed with reduced opacity
- **THEN** these days SHALL NOT be interactive

#### Scenario: Today highlighting
- **WHEN** the current date falls within the displayed month
- **THEN** today's cell SHALL be visually highlighted with a distinct border or background color

### Requirement: Event display on calendar
Events SHALL be displayed on the calendar grid based on their date range.

#### Scenario: Single-day event display
- **WHEN** an event has `start_date` equal to `end_date`
- **THEN** a colored dot or badge SHALL be displayed on that date cell
- **THEN** the dot/badge color SHALL use the Event's `color` field value

#### Scenario: Multi-day event display
- **WHEN** an event spans multiple days (`start_date` != `end_date`)
- **THEN** a colored bar SHALL span across all date cells from `start_date` to `end_date`
- **THEN** the bar color SHALL use the Event's `color` field value
- **THEN** the event title SHALL be displayed on the bar (truncated if necessary)

#### Scenario: Multiple events on the same day
- **WHEN** multiple events overlap on a single date
- **THEN** events SHALL be stacked vertically within the date cell
- **THEN** if more than 3 events overlap, a "+{n} weitere" indicator SHALL be shown

#### Scenario: Event without color
- **WHEN** an event has no `color` field set (null or empty)
- **THEN** a default color (primary theme color) SHALL be used for the dot/bar

### Requirement: Calendar navigation
Users SHALL be able to navigate between months.

#### Scenario: Previous and next month buttons
- **WHEN** the calendar view is displayed
- **THEN** "Vorheriger Monat" (←) and "Nächster Monat" (→) navigation buttons SHALL be displayed
- **THEN** a month/year label SHALL be displayed in German format (e.g., "April 2026")

#### Scenario: Navigate to previous month
- **WHEN** a user clicks the previous month button
- **THEN** the calendar SHALL display the previous month's grid
- **THEN** events for that month SHALL be loaded and displayed

#### Scenario: Navigate to next month
- **WHEN** a user clicks the next month button
- **THEN** the calendar SHALL display the next month's grid
- **THEN** events for that month SHALL be loaded and displayed

#### Scenario: Date calculations use date-fns
- **WHEN** date calculations are performed for the calendar (start of month, end of month, days in month, etc.)
- **THEN** the `date-fns` library SHALL be used (already installed in the project)

### Requirement: Calendar event interaction
Users SHALL be able to interact with events on the calendar.

#### Scenario: Click on event navigates to dashboard
- **WHEN** a user clicks on an event dot, bar, or title in the calendar
- **THEN** navigation SHALL occur to the event dashboard page (`/events/{slug}/`)

#### Scenario: Hover tooltip
- **WHEN** a user hovers over an event on the calendar (desktop only)
- **THEN** a tooltip SHALL display: event title, date range (formatted as "dd.MM. – dd.MM.yyyy"), and location (if set)

### Requirement: Mobile-responsive calendar
The calendar SHALL adapt to small screen sizes.

#### Scenario: Week view on mobile
- **WHEN** the viewport width is below 640px (Tailwind `sm` breakpoint)
- **THEN** the calendar SHALL switch to a week view showing 7 days at a time
- **THEN** week navigation buttons ("Vorherige Woche" / "Nächste Woche") SHALL replace month navigation

#### Scenario: Touch-friendly event targets
- **WHEN** the calendar is displayed on a touch device
- **THEN** event dots/bars SHALL have a minimum touch target size of 44×44px
- **THEN** navigation buttons SHALL have a minimum touch target size of 44×44px

## Member View

### Requirement: Member tab structure consolidated
The member tab navigation SHALL be consolidated from 5 tabs (Übersicht, Anmeldung, Teilnehmende, Einladung, Packliste) to 4 tabs by merging registration into the overview tab.

#### Scenario: Tab navigation for members
- **WHEN** an invited (non-manager) user views the event detail page
- **THEN** the following tabs SHALL be available: Übersicht, Teilnehmende, Einladung & Gäste, Packliste
- **THEN** the "Anmeldung" tab SHALL NOT appear as a separate tab
- **THEN** the active tab SHALL be reflected in the URL as a query parameter (e.g., `?tab=overview`)

#### Scenario: Tab order and labels
- **WHEN** the member tabs are rendered
- **THEN** they SHALL appear in this order: "Übersicht", "Teilnehmende", "Einladung & Gäste", "Packliste"
- **THEN** tab labels SHALL be in German

### Requirement: Übersicht tab includes registration
The Übersicht tab SHALL include registration status and registration form, replacing the former separate "Anmeldung" tab. Registration functionality MUST be directly accessible from the overview.

#### Scenario: Overview with registration status for registered user
- **WHEN** a registered member views the Übersicht tab
- **THEN** the tab SHALL show event information (name, dates, location, phase timeline)
- **THEN** the tab SHALL show a registration status card: "Du bist angemeldet" with participant count
- **THEN** options to update the registration (change booking option, add/remove participants) SHALL be available inline
- **THEN** an "Abmelden" button SHALL be visible

#### Scenario: Overview with registration form for unregistered user
- **WHEN** an unregistered member views the Übersicht tab
- **AND** the event phase is `registration`
- **THEN** the tab SHALL show event information followed by the registration form
- **THEN** the registration form SHALL include person selection and booking option assignment
- **THEN** a prominent "Jetzt anmelden" call-to-action SHALL be displayed

#### Scenario: Overview with registration outside registration phase
- **WHEN** the event phase is NOT `registration`
- **AND** the user is not registered
- **THEN** the registration form SHALL be disabled
- **THEN** a message SHALL explain why: "Die Anmeldephase hat noch nicht begonnen" (pre_registration) or "Die Anmeldephase ist beendet" (pre_event/running/completed)

#### Scenario: Unregister from overview
- **WHEN** a registered user clicks "Abmelden" on the Übersicht tab
- **THEN** a confirmation dialog SHALL appear: "Möchtest du dich wirklich abmelden?"
- **THEN** confirming SHALL soft-delete the registration (set deleted_at, not hard-delete)

#### Scenario: Booking option dropdown shows only bookable options
- **WHEN** a regular user views the booking option dropdown during registration
- **THEN** only BookingOptions where `is_bookable` is `True` SHALL be displayed
- **THEN** expired or not-yet-available options SHALL be hidden

### Requirement: Phase guidance banners
The event detail page SHALL show phase-specific guidance banners with concrete action instructions, replacing the generic "Event befindet sich im Entwurf" message.

#### Scenario: Draft phase banner
- **WHEN** the event is in `draft` phase
- **THEN** a guidance banner SHALL display: "Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden."
- **THEN** the banner SHALL include the action hint: "Konfiguriere dein Event und setze ein Registrierungsdatum, um die Anmeldung zu aktivieren."

#### Scenario: Pre-registration phase banner
- **WHEN** the event is in `pre_registration` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung beginnt am {date}."
- **THEN** the banner SHALL include the action hint: "Lade in der Zwischenzeit Teilnehmer ein."

#### Scenario: Registration phase banner
- **WHEN** the event is in `registration` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung ist offen bis {date}."
- **THEN** the banner SHALL include the action hint: "Teile den Anmeldelink mit deiner Gruppe."

#### Scenario: Pre-event phase banner
- **WHEN** the event is in `pre_event` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung ist geschlossen. Das Event beginnt am {date}."
- **THEN** the banner SHALL include the action hint: "Überprüfe die Teilnehmerliste und Zahlungen."

#### Scenario: Running phase banner
- **WHEN** the event is in `running` phase
- **THEN** a guidance banner SHALL display: "Das Event läuft gerade!"
- **THEN** the banner SHALL include the action hint: "Nutze das Anwesenheits-Tracking."

#### Scenario: Completed phase banner
- **WHEN** the event is in `completed` phase
- **THEN** a guidance banner SHALL display: "Das Event ist abgeschlossen."
- **THEN** the banner SHALL include the action hint: "Exportiere Teilnehmerdaten und archiviere das Event."

#### Scenario: Banner visibility for both roles
- **WHEN** any user (member or manager) views the event detail page
- **THEN** the phase guidance banner SHALL be visible at the top of the Übersicht tab
- **THEN** the banner SHALL use a visually distinct style (colored background matching the phase)

### Requirement: Guest registration link display for organizers
The event dashboard SHALL show the guest registration link to organizers when guest registration is enabled.

#### Scenario: Settings tab shows guest registration toggle
- **WHEN** an organizer views the Settings tab of the event dashboard
- **THEN** a toggle for "Gastregistrierung aktivieren" SHALL be displayed
- **THEN** when enabled, a copyable link to `/events/{slug}/register` SHALL be displayed
- **THEN** a "Link kopieren" button SHALL copy the full URL to the clipboard

#### Scenario: Overview tab shows guest registration status
- **WHEN** an organizer views the Übersicht tab
- **AND** `guest_registration_enabled` is `True`
- **THEN** a hint card SHALL be displayed: "Gastregistrierung aktiv — Teile den Anmeldelink mit Eltern"
- **THEN** the link SHALL be clickable and copyable
