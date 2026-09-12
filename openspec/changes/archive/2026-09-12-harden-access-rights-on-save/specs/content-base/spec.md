## MODIFIED Requirements

### Requirement: Content status is staff-controlled
The `status` field of content (GroupSession, Blog, Game) SHALL only be modifiable by Staff. A content author SHALL be able to edit content fields but SHALL NOT be able to set their own content to `approved` or bypass the moderation workflow.

#### Scenario: Author cannot self-approve
- **WHEN** a non-staff author PATCHes their own content with `status: "approved"`
- **THEN** the system SHALL ignore or reject the `status` change and the content SHALL keep its previous status

#### Scenario: Staff can change status
- **WHEN** a staff user PATCHes content `status`
- **THEN** the status SHALL be updated
