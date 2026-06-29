## ADDED Requirements

### Requirement: Contiguous date range validation

The system SHALL validate that every date in a MealPlan's date range `[start_datetime.date(), end_datetime.date()]` has at least one associated Meal record. This validation MUST run after every day-level write operation.

Validation MUST be skipped if either `start_datetime` or `end_datetime` is NULL.

When validation fails, the system MUST return HTTP 400 with a German-language error message specifying the missing date.

#### Scenario: Plan with all days covered passes validation
- **WHEN** a MealPlan has `start_datetime=2026-07-10 08:00`, `end_datetime=2026-07-12 20:00`, and Meals exist for July 10, July 11, and July 12
- **THEN** validation passes without error

#### Scenario: Plan with a missing middle day fails validation
- **WHEN** a MealPlan has `start_datetime=2026-07-10 08:00`, `end_datetime=2026-07-12 20:00`, but only July 10 and July 12 have Meals
- **THEN** validation returns HTTP 400 with message containing "11.07.2026"

#### Scenario: Plan without date range skips validation
- **WHEN** a MealPlan has `start_datetime=NULL` or `end_datetime=NULL`
- **THEN** validation is skipped entirely

### Requirement: Auto-extend range on add-day

When a day is added via `POST /{meal_plan_id}/days/` and the given date lies outside the current `[start_datetime, end_datetime]` range, the system SHALL automatically extend the range to include the new date.

If the date is before the current start, `start_datetime` SHALL be set to midnight of that date. If after the current end, `end_datetime` SHALL be set to midnight of that date.

#### Scenario: Add day before current start
- **WHEN** a MealPlan has `start_datetime=2026-07-10` and a day is added for July 9
- **THEN** `start_datetime` becomes `2026-07-09 00:00` and meals for July 9 are created

#### Scenario: Add day after current end
- **WHEN** a MealPlan has `end_datetime=2026-07-12` and a day is added for July 13
- **THEN** `end_datetime` becomes `2026-07-13 00:00` and meals for July 13 are created

#### Scenario: Add day within existing range
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and a day is added for July 11 (which already has meals)
- **THEN** the system returns HTTP 400 "Dieser Tag existiert bereits im Essensplan" (existing behavior preserved)

### Requirement: Edge-only day deletion

The system SHALL only allow deleting days that are at either edge of the date range (first or last date with meals). Deleting a middle day MUST return HTTP 400.

When the first or last day is deleted, the system SHALL automatically shrink `start_datetime` or `end_datetime` to the next existing day with meals.

#### Scenario: Delete first day succeeds
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and the user deletes July 10
- **THEN** all meals for July 10 are deleted, `start_datetime` is updated to `2026-07-11 00:00`, and validation passes

#### Scenario: Delete middle day fails
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and the user tries to delete July 11
- **THEN** the system returns HTTP 400 with message "Dieser Tag liegt in der Mitte des Essensplans und kann nicht gelöscht werden"

#### Scenario: Delete last day succeeds
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and the user deletes July 12
- **THEN** all meals for July 12 are deleted, `end_datetime` is updated to `2026-07-11 00:00`, and validation passes

#### Scenario: Delete the only remaining day
- **WHEN** a MealPlan has only one day with meals (range is a single date) and the user deletes it
- **THEN** meals are deleted and `start_datetime` and `end_datetime` are both set to NULL

### Requirement: Smart merge on PATCH range change

When a MealPlan's `start_datetime` or `end_datetime` changes via PATCH, the system SHALL perform a smart merge:
1. Delete all Meals whose date is outside the new range
2. Create default meals for dates inside the new range that have no Meals yet
3. Leave existing Meals for overlapping dates unchanged

The system SHALL compare the new values with the current values to detect actual changes — setting the same values again MUST NOT trigger a merge.

#### Scenario: Extend range at both ends
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` with meals on all days, and the user patches `end_datetime` to `2026-07-14`
- **THEN** July 10-12 meals are untouched, default meals are created for July 13 and July 14

#### Scenario: Shrink range at both ends
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-14` with meals on all days, and the user patches `start_datetime` to `2026-07-12` and `end_datetime` to `2026-07-13`
- **THEN** meals for July 10, 11, and 14 are deleted, meals for July 12-13 are untouched

#### Scenario: Shift range entirely (non-overlapping)
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and the user patches to `2026-07-20` to `2026-07-22`
- **THEN** all old meals are deleted, default meals are created for July 20-22

#### Scenario: No actual change to range
- **WHEN** a MealPlan has range `2026-07-10` to `2026-07-12` and PATCH is called with the same values
- **THEN** no merge operation is triggered, existing meals are preserved

### Requirement: add-day-before and add-day-after remain unchanged

The existing `POST /{meal_plan_id}/add-day-before/` and `POST /{meal_plan_id}/add-day-after/` endpoints SHALL continue to work as before: shift the range by one day and create meals for the new edge day. These endpoints already maintain contiguity by construction.

#### Scenario: Add day before maintains contiguity
- **WHEN** a user calls `add-day-before` on a MealPlan with range `2026-07-10` to `2026-07-12`
- **THEN** `start_datetime` is shifted to `2026-07-09`, July 9 meals are created, July 10-12 meals are untouched

### Requirement: Meal-level CRUD does not validate contiguity

Individual meal creation (`POST /{meal_plan_id}/meals/`) and deletion (`DELETE /{meal_plan_id}/meals/{mid}/`) MUST NOT trigger contiguity validation. This is a pragmatic decision to avoid expensive date-range queries on every meal mutation.

#### Scenario: Delete last meal of a middle day is allowed
- **WHEN** a user deletes all meals from July 11 of a MealPlan with range `2026-07-10` to `2026-07-12`
- **THEN** the deletion succeeds without validation error (a silent gap is created, detectable on next day-level operation)
