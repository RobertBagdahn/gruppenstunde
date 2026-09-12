## ADDED Requirements

### Requirement: Local-First Meal Edits
Edits performed on any scheduled meal (e.g., modifying recipes, portions, or ingredient overrides) SHALL apply exclusively to that specific scheduled meal instance by default and MUST NOT modify any shared reference meal or template without explicit user action.

#### Scenario: Editing scheduled meal instance
- **WHEN** user updates a recipe or ingredient quantity in a Tuesday breakfast slot
- **THEN** only the Tuesday breakfast meal record is updated in the database
- **AND** other breakfast slots and reference meals remain unaffected

### Requirement: Default Empty Slots on Plan Creation
When a meal plan is created with a start and end date, the system SHALL automatically generate empty standard meal slots (Breakfast, Lunch, Dinner) for each day within the range.

#### Scenario: Auto-generating empty meal slots on creation
- **WHEN** user creates a meal plan spanning 3 days
- **THEN** system initializes the plan with Breakfast, Lunch, and Dinner slots for each of the 3 days in pending status
