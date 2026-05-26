## MODIFIED Requirements

### Requirement: Shopping List View Modes
The shopping list detail endpoint SHALL accept a `view` query parameter to control item grouping.

#### Scenario: Default view remains detailed
- **WHEN** GET /api/shopping-lists/{id}/items/ is called without view parameter
- **THEN** items SHALL be returned in their current detailed format (no change)

#### Scenario: Print action available
- **WHEN** user views a shopping list
- **THEN** a "Drucken" button SHALL be displayed that triggers browser print with optimized CSS
