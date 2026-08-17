## MODIFIED Requirements

### Requirement: Planner collaborator migration to ContentCollaborator
The system SHALL migrate all `PlannerCollaborator` records to `ContentCollaborator` with `content_type` pointing to the Planner model. The planner API's collaborator endpoints SHALL be updated to use `ContentCollaborator`. Role-based access SHALL remain unchanged in behavior.

#### Scenario: PlannerCollaborator migrated
- **WHEN** the migration runs
- **THEN** all existing `PlannerCollaborator` rows SHALL become `ContentCollaborator` rows
- **THEN** planner access control SHALL continue to work identically via `ContentCollaborator`

#### Scenario: Adding collaborator uses ContentCollaborator
- **WHEN** a planner owner adds a collaborator via API
- **THEN** a `ContentCollaborator` record SHALL be created
