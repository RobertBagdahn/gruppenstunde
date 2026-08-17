## MODIFIED Requirements

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

## ADDED Requirements

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
