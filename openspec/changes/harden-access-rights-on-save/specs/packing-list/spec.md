## ADDED Requirements

### Requirement: Packing list clone respects visibility
Cloning a PackingList SHALL only be allowed if the requesting user can read the list: templates are always clonable, `link_only` lists are clonable, and `private` lists SHALL only be clonable by users with edit permission (`user_can_edit`).

#### Scenario: Clone a private list without permission
- **WHEN** an authenticated user clones a `private` PackingList they cannot edit
- **THEN** the system SHALL return HTTP 404 and SHALL not create a clone

#### Scenario: Clone an own private list
- **WHEN** the owner clones their own `private` PackingList
- **THEN** the system SHALL create the clone

#### Scenario: Clone a template
- **WHEN** any user clones a template PackingList
- **THEN** the system SHALL create the clone

### Requirement: Packing list text export respects visibility
The text export endpoint SHALL require the same read authorization as the detail endpoint. Private lists SHALL NOT be exportable by unauthenticated users or users without edit permission.

#### Scenario: Anonymous export of private list
- **WHEN** an unauthenticated user exports a `private` PackingList as text
- **THEN** the system SHALL return HTTP 404

#### Scenario: Authorized user exports list
- **WHEN** an authorized user exports a PackingList they can read
- **THEN** the system SHALL return the plain-text export
