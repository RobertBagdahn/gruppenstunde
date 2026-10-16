## ADDED Requirements

### Requirement: Reported Food release regressions have deterministic browser coverage
The required Food E2E suite SHALL cover Buffet entry, Buffet persistence, and adding an accessible draft Ingredient as a recipe exchange alternative. These tests SHALL use deterministic fixtures or API interception, assert visible UI state and relevant request/response contracts, and fail on unexpected errors from the workflow under test.

#### Scenario: Buffet action opens and persists
- **WHEN** an authenticated editor opens the buffet builder from a supported meal action, selects an item, saves, and reloads the meal
- **THEN** the test SHALL verify the correct buffet endpoints were called
- **THEN** the chosen item SHALL be visible after reload
- **THEN** any unexpected 4xx/5xx response SHALL fail the test

#### Scenario: Draft Ingredient is added as a recipe alternative
- **WHEN** an authenticated recipe editor selects a readable draft Ingredient as an alternative and saves
- **THEN** the test SHALL verify the Ingredient remains in draft status and the recipe exchange retains its name and portion after reload
- **THEN** any unexpected 4xx/5xx response or generic “Zutat” fallback for the new alternative SHALL fail the test

#### Scenario: Builder and alternative recover from server failure
- **WHEN** a relevant read or mutation is deterministically intercepted with HTTP 500
- **THEN** the test SHALL verify safe German error feedback, preserved user input, and the applicable explicit retry behavior
