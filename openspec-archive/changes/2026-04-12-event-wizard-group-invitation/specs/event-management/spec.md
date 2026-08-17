## MODIFIED Requirements

### Requirement: Event detail API response
The event detail API response SHALL include responsible person contact information, enhanced participant data, computed phase, role-appropriate participant statistics, and meeting/pickup point data.

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

#### Scenario: Event detail includes meeting and pickup points
- **WHEN** GET `/api/events/{slug}/` for an event with `meeting_point` and/or `pickup_point` set
- **THEN** the response SHALL include `meeting_point: { id, name, street, zip_code, city, description, full_address } | null`
- **THEN** the response SHALL include `pickup_point: { id, name, street, zip_code, city, description, full_address } | null`

## ADDED Requirements

### Requirement: Group invitation during event creation
The event creation API SHALL accept a list of group IDs to invite during event creation.

#### Scenario: Create event with invited groups
- **WHEN** POST `/api/events/` with `invited_group_ids: [1, 2, 3]`
- **AND** the authenticated user is a member of groups 1, 2, and 3
- **THEN** the system SHALL add groups 1, 2, and 3 to `event.invited_groups`
- **THEN** all members of those groups SHALL be considered invited (via `user_is_invited()`)

#### Scenario: Create event without groups
- **WHEN** POST `/api/events/` without `invited_group_ids` or with an empty array
- **THEN** no groups SHALL be added to `event.invited_groups`
- **THEN** the event SHALL be created successfully

#### Scenario: Invalid group IDs are ignored
- **WHEN** POST `/api/events/` with `invited_group_ids` containing IDs that do not exist or the user is not a member of
- **THEN** those IDs SHALL be silently ignored
- **THEN** valid group IDs SHALL still be processed

### Requirement: Wizard group selection UI
The event creation wizard Step 2 SHALL display a group selection UI before the person list.

#### Scenario: User has groups
- **WHEN** the user navigates to Step 2 of the event creation wizard
- **AND** the user is a member of at least one group
- **THEN** the wizard SHALL display a "Gruppen einladen" section with checkboxes for each group
- **THEN** each group SHALL show its name

#### Scenario: User has no groups
- **WHEN** the user navigates to Step 2
- **AND** the user is not a member of any group
- **THEN** the "Gruppen einladen" section SHALL NOT be displayed

#### Scenario: Selected groups shown in summary
- **WHEN** the user has selected groups in Step 2
- **AND** the user navigates to the summary step (Step 8)
- **THEN** the summary SHALL display the names of all selected groups under "Eingeladene Gruppen"
