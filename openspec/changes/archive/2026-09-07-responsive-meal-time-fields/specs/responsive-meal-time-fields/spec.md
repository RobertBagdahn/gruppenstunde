## ADDED Requirements

### Requirement: Responsive meal-time layout

The meal-plan wizard and existing meal-plan settings SHALL render the four meal default-time groups responsively without horizontal overflow. Each group SHALL contain adjacent start and end time fields.

#### Scenario: Mobile layout
- **WHEN** an authenticated user opens standard meal times at a viewport width from 320px through 639px
- **THEN** each meal SHALL occupy its own row, with its start and end time fields displayed next to each other and their complete values visible

#### Scenario: Tablet layout
- **WHEN** an authenticated user opens standard meal times at a viewport width from 640px through 1023px
- **THEN** the four meals SHALL be displayed as two groups per row, with complete time values visible and no horizontal scrolling

#### Scenario: Desktop layout
- **WHEN** an authenticated user opens standard meal times at a viewport width of at least 1024px
- **THEN** the four meals SHALL be displayed in one row, with complete time values visible and no horizontal scrolling

#### Scenario: Existing-plan settings use the same layout
- **WHEN** an authenticated user with edit permission opens standard meal times for an existing meal plan
- **THEN** the same mobile, tablet, and desktop layout rules SHALL apply without changing the stored values
