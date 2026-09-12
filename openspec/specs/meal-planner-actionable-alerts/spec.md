# meal-planner-actionable-alerts Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: Header Plan-Check Button
The meal plan header SHALL provide a `[ 🔔 Plan-Check (X) ]` trigger button displaying the current count of unresolved planning warnings or gaps.

#### Scenario: Displaying alert count badge
- **WHEN** a meal plan contains empty mandatory meal slots or budget exceedances
- **THEN** header button displays an attention badge showing the exact count of identified issues (e.g., "Plan-Check (3)")

### Requirement: Actionable Alerts Flyout
Clicking the Plan-Check trigger SHALL open a structured flyout listing prioritized issues, each accompanied by a 1-click action button.

#### Scenario: Resolving empty meal slot via action button
- **WHEN** user views an alert stating "Samstagmittag ist noch leer" and clicks "[ 🪄 Gericht vorschlagen ]"
- **THEN** system triggers AI suggestion generation tailored to that specific slot and displays suggestions immediately
