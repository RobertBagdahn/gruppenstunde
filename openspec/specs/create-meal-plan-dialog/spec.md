# create-meal-plan-dialog Specification

## Purpose
Defines requirements for the unified create/copy dialog for meal plans.

## Requirements
### Requirement: Unified create/copy dialog
The system SHALL provide a single dialog for creating meal plans. The dialog SHALL support both creating an empty plan (with auto-generated default meals for the date range) and creating a copy of an existing plan via deep copy.

#### Scenario: Dialog opens with defaults
- **WHEN** user clicks "Neuer Essensplan"
- **THEN** a dialog opens with name pre-filled to "Neuer Essensplan", start pre-filled to next Friday 18:00, end pre-filled to next Sunday 14:00, and portions pre-filled to 10

#### Scenario: Next Friday computed smartly
- **WHEN** the dialog opens on a Monday–Wednesday
- **THEN** the start date defaults to this week's Friday

#### Scenario: Next Friday computed for late week
- **WHEN** the dialog opens on a Thursday–Sunday
- **THEN** the start date defaults to next week's Friday

#### Scenario: Create empty plan
- **WHEN** user submits with default values and no source plan selected
- **THEN** the system calls `POST /api/meal-plans/` with name "Neuer Essensplan", start and end datetimes set, norm_portions=10
- **AND** the system auto-generates default meals for Friday–Sunday
- **AND** navigates to the new plan's detail page

#### Scenario: Create with optional copy
- **WHEN** user checks "Von Plan kopieren" and selects a source plan
- **THEN** a badge appears showing "Vorlage: <source name> (<meals_count> Mahlzeiten)"
- **AND** the end datetime updates to `start + (source.end - source.start)`
- **AND** the portions field updates to the source's norm_portions
- **AND** the name field is NOT overwritten (remains "Neuer Essensplan" or user's input)

#### Scenario: Submit with source plan
- **WHEN** user submits with a source plan selected and name "Neuer Essensplan"
- **THEN** the system calls `POST /api/meal-plans/{id}/duplicate/` with name "Neuer Essensplan (Kopie)", the selected start datetime, and the source's norm_portions
- **AND** the system deep-copies all meals and items shifted by the date offset
- **AND** navigates to the new plan's detail page

#### Scenario: Submit with source plan and custom name
- **WHEN** user submits with a source plan selected and custom name "Pfingstlager"
- **THEN** the system calls the duplicate endpoint with name "Pfingstlager (Kopie)"

#### Scenario: Dialog validation
- **WHEN** user submits with empty name and no source selected
- **THEN** the submit button is disabled
