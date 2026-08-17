# food-access-audit Specification

## Purpose

This specification defines auditing and retention for privileged Food resource access.
## Requirements
### Requirement: Staff detail and export audit
The system SHALL audit every Staff access to a private Food detail or export endpoint, storing user, resource type, resource identifier, endpoint, timestamp, and outcome.

#### Scenario: Staff opens private Recipe detail
- **WHEN** Staff requests a private Recipe detail endpoint
- **THEN** the system SHALL create a successful audit record

#### Scenario: Staff exports private Ingredients
- **WHEN** Staff exports private Ingredients
- **THEN** the system SHALL create an audit record for the export request

### Requirement: Audit retention
Audit records SHALL be deleted after 30 days by a batch-capable cleanup process.

#### Scenario: Old audit records are cleaned
- **WHEN** the cleanup process runs
- **THEN** records older than 30 days SHALL be deleted and newer records SHALL remain
