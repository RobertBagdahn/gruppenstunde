# manual-norm-portions-override Specification

## Purpose
Provide reliable meal plan update responses, persistent manual norm portions overrides for event-linked meal plans, synchronization behavior with group members and events, and settings UI controls.

## Requirements

### Requirement: Reliable Meal Plan PATCH Responses
The system SHALL read and validate each successful MealPlan PATCH response exactly once.

#### Scenario: Updating meal plan settings succeeds
- **WHEN** an authenticated editor updates MealPlan settings through `PATCH /api/meal-plans/{id}/`
- **THEN** the frontend SHALL parse the response without a `Body is disturbed or locked` error
- **AND** the successful mutation SHALL invalidate the current MealPlan query

#### Scenario: Updating without authentication fails
- **WHEN** an unauthenticated client sends `PATCH /api/meal-plans/{id}/`
- **THEN** the API SHALL reject the request with its existing authentication error
- **AND** the frontend SHALL expose the structured API error without attempting to parse the response body twice

### Requirement: Manual Norm Portions for Event Plans
The system SHALL allow an editor to enable a persistent manual norm portions value for an event-linked MealPlan.

#### Scenario: Enable manual norm portions
- **WHEN** an authorized editor updates an event-linked MealPlan with manual mode enabled and a positive whole-number `norm_portions` value
- **THEN** the API SHALL persist the manual mode and value
- **AND** subsequent group member changes SHALL preserve that value

#### Scenario: Reject manual mode for standalone plans
- **WHEN** an authorized editor attempts to enable manual norm portions on a MealPlan without an event link
- **THEN** the API SHALL reject the request with a validation error

#### Scenario: Reject fractional or invalid manual values
- **WHEN** an authorized editor submits zero, a negative number, or a fractional `norm_portions` value while manual mode is enabled
- **THEN** the API SHALL reject the request with a validation error

### Requirement: Automatic Recalculation Mode
The system SHALL allow an event-linked MealPlan to switch from manual norm portions back to automatic group calculation.

#### Scenario: Disable manual mode
- **WHEN** an authorized editor disables manual mode on an event-linked MealPlan
- **THEN** the API SHALL recalculate `norm_portions` from the current group members and activity factor
- **AND** future group member changes SHALL update `norm_portions` automatically

#### Scenario: Activity factor changes while manual mode is active
- **WHEN** an authorized editor changes the activity factor while manual mode is active
- **THEN** the activity factor SHALL be stored
- **AND** the manual `norm_portions` value SHALL remain unchanged

### Requirement: Group Member and Event Synchronization Behavior
The system SHALL preserve manual norm portions while updating the group member set.

#### Scenario: Add, edit, or remove a group member in manual mode
- **WHEN** an authorized editor adds, edits, or removes a group member while manual mode is active
- **THEN** the group member operation SHALL succeed
- **AND** the manual `norm_portions` value SHALL remain unchanged

#### Scenario: Synchronize event participants in manual mode
- **WHEN** an authorized editor synchronizes event participants while manual mode is active
- **THEN** the participant-derived group members SHALL be updated
- **AND** the manual `norm_portions` value SHALL remain unchanged

### Requirement: Norm Portions Settings UI
The Food-Frontend SHALL show the manual/automatic norm portions switch only for event-linked MealPlans.

#### Scenario: Event-linked plan settings
- **WHEN** an editor opens settings for an event-linked MealPlan
- **THEN** the UI SHALL show the current mode and the effective norm portions
- **AND** the editor SHALL be able to switch to manual mode, enter a whole-number value, save it, and switch back to automatic mode

#### Scenario: Standalone plan settings
- **WHEN** an editor opens settings for a MealPlan without an event link
- **THEN** the UI SHALL retain the existing direct norm portions input
- **AND** the manual/automatic event override switch SHALL not be shown
