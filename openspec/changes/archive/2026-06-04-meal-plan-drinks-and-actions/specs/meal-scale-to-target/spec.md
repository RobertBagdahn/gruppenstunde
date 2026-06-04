## ADDED Requirements

### Requirement: Scale meal items to target calories
A meal action SHALL scale all items of a meal proportionally so that the meal's Ist calories approach its Soll calories (`NORM_PERSON_DAILY_KCAL × day_part_factor`). Each item's factor SHALL be multiplied by `target_kcal / current_kcal` and rounded to one decimal place. The operation SHALL be exposed as a backend endpoint and applied atomically.

#### Scenario: Items scaled proportionally to Soll
- **WHEN** a meal has Soll 700 kcal and current Ist 350 kcal with items at factor 1.0
- **THEN** each item's factor SHALL be set to `round(1.0 × 2.0, 1) = 2.0`

#### Scenario: Factors rounded to one decimal
- **WHEN** scaling produces a raw factor of 1.3847
- **THEN** the persisted factor SHALL be 1.4

#### Scenario: Cannot scale when current calories are zero
- **WHEN** a meal has no items contributing calories (current Ist = 0)
- **THEN** the scale operation SHALL be a no-op and report that scaling is not possible

#### Scenario: Cannot scale synced or external meals
- **WHEN** a meal is `is_synced=true` or `is_external=true`
- **THEN** the scale operation SHALL be rejected (no item factors changed)
