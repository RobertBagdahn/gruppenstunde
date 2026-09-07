## ADDED Requirements

### Requirement: Meal-plan core flows are covered by browser regression tests
The Food E2E suite SHALL verify MealPlan creation, settings updates, default meal times, manual norm portions, and deletion using authenticated isolated data.

#### Scenario: Empty meal plan creation roundtrip
- **WHEN** an authenticated user creates an empty MealPlan with a fixed name, date range, and portions
- **THEN** the plan detail URL SHALL open, the plan name and portions SHALL be visible, and reload SHALL preserve the values

#### Scenario: Custom meal times drive new meals
- **WHEN** a user configures custom default meal times and creates a plan
- **THEN** newly added meals SHALL use those configured start and end times

#### Scenario: Manual event norm portions remain stable
- **WHEN** an event-linked plan is switched to manual norm portions and saved
- **THEN** the value SHALL remain unchanged after settings reload and participant/activity changes until automatic mode is restored

#### Scenario: Standalone plans do not expose event-only manual mode
- **WHEN** a standalone MealPlan settings dialog is opened
- **THEN** event-only manual norm-portion controls SHALL not be shown
