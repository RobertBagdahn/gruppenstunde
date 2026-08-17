# event-mealplan-relation Specification

## Purpose

This specification defines the canonical relation between Events and MealPlans.
## Requirements
### Requirement: Canonical Event-MealPlan relation
The system SHALL store Event-to-MealPlan links in a canonical relation table and SHALL enforce that one MealPlan is linked to at most one Event.

#### Scenario: Authorized user links resources
- **WHEN** a user has edit access to both an Event and a MealPlan and creates a link
- **THEN** the relation SHALL be stored successfully

#### Scenario: User lacks edit access on one side
- **WHEN** a user lacks edit access to either the Event or MealPlan
- **THEN** the API SHALL reject the link with HTTP 403

### Requirement: Existing relation migration
The migration SHALL transfer existing links into the relation table. When Event and MealPlan foreign keys disagree, the MealPlan-side link SHALL win.

#### Scenario: Consistent existing link
- **WHEN** both legacy foreign keys point to the same pair
- **THEN** exactly one relation row SHALL be created

#### Scenario: Conflicting existing link
- **WHEN** the legacy foreign keys point to different Events
- **THEN** the MealPlan-side Event SHALL be migrated and the conflict SHALL be recorded
