# meal-plan-frontend Delta Specification

## MODIFIED Requirements

### Requirement: Meal plan list page
The system SHALL display a section-based list of meal plans at `/meal-plans/app` showing all plans the user owns or collaborates on. The list SHALL be divided into four sections: Top-5 hero cards for the 5 closest upcoming plans (always expanded), "Weitere Pläne" for remaining upcoming plans (collapsed), "Referenzpläne" for community-verified templates (collapsed), and "Vergangene Pläne" for past plans (collapsed). Each list item SHALL show name, status badge, event name if linked, date range, countdown to start, progress bar (filled/total meals), portions with reserve factor, nutritional tags, and a traffic light readiness indicator (green/yellow/red based on fill percentage).

#### Scenario: User views their meal plans
- **WHEN** an authenticated user navigates to `/meal-plans/app`
- **THEN** the system shows a four-section layout with Top-5 hero cards expanded and all other sections collapsed

#### Scenario: User creates a new meal plan
- **WHEN** the user clicks the create button
- **THEN** a dialog opens with default values and optional source plan selector

#### Scenario: User opens a meal plan
- **WHEN** the user clicks a meal plan in the list
- **THEN** the system navigates to `/meal-plans/:id`
