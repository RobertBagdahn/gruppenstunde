## ADDED Requirements

### Requirement: MeetingPoint update restricted to creator and group admin
Updating a MeetingPoint SHALL require the requesting user to be the `created_by` user or a group admin of the MeetingPoint's group. Plain group members SHALL NOT be able to modify MeetingPoints created by others.

#### Scenario: Creator updates own meeting point
- **WHEN** the `created_by` user PATCHes their MeetingPoint
- **THEN** the update SHALL succeed

#### Scenario: Group admin updates group meeting point
- **WHEN** a group admin PATCHes a MeetingPoint of their group
- **THEN** the update SHALL succeed

#### Scenario: Group member cannot update another's meeting point
- **WHEN** a plain group member PATCHes a MeetingPoint created by another user in the same group
- **THEN** the system SHALL return HTTP 403 and SHALL not mutate the MeetingPoint

#### Scenario: Unrelated user cannot update
- **WHEN** an unrelated authenticated user PATCHes a MeetingPoint
- **THEN** the system SHALL return HTTP 404
