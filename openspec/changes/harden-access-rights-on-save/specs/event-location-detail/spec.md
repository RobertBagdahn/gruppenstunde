## ADDED Requirements

### Requirement: EventLocation update and delete authorization
Updating or deleting an EventLocation SHALL require the requesting user to be the `created_by` user or Staff. Any other authenticated user SHALL NOT be able to modify or delete an EventLocation.

#### Scenario: Creator updates location
- **WHEN** the `created_by` user PATCHes their EventLocation
- **THEN** the update SHALL succeed

#### Scenario: Unrelated user cannot update location
- **WHEN** an authenticated user PATCHes an EventLocation they did not create
- **THEN** the system SHALL return HTTP 403 and SHALL not mutate the location

#### Scenario: Unrelated user cannot delete location
- **WHEN** an authenticated user DELETEs an EventLocation they did not create
- **THEN** the system SHALL return HTTP 403 and SHALL not delete the location

#### Scenario: Staff can update or delete
- **WHEN** a staff user updates or deletes any EventLocation
- **THEN** the operation SHALL succeed
