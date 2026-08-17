## ADDED Requirements

### Requirement: NutritionView separates day-sum and event-average rules visually

The NutritionView component in the MealPlan UI SHALL display rules in two distinct visual sections:

1. **"Summe pro Tag"** — Shows `scope=day` rules. Each day with meals SHALL have its own rule evaluation displayed. When a specific day is selected via the day selector, only that day's evaluations SHALL be shown.
2. **"Durchschnitt pro Tag (Ø Plan)"** — Shows `scope=meal_event` rules. SHALL always display the daily average across all days. This section SHALL be hidden when a specific single day is selected (since sum = average for one day).

Each section SHALL have a distinct header with an icon and label indicating the evaluation mode (Summe vs. Durchschnitt). Rules within each section SHALL use `SollIstBar` with a `scopeLabel` indicating the context.

#### Scenario: Both sections visible when viewing entire plan

- **WHEN** the NutritionView is displayed for a MealPlan with 3 days
- **AND** the user has selected "Gesamter Plan (3 Tage)" in the day selector
- **THEN** a "Summe pro Tag" section SHALL render day-level rules for each of the 3 days
- **AND** a "Durchschnitt pro Tag (Ø Plan)" section SHALL render meal_event-level rules with the daily average

#### Scenario: Only sum section visible when viewing a specific day

- **WHEN** the NutritionView is displayed for a MealPlan with 3 days
- **AND** the user has selected a specific day (e.g. "Mo 01.06") in the day selector
- **THEN** the "Summe pro Tag" section SHALL render only that day's rules
- **AND** the "Durchschnitt pro Tag (Ø Plan)" section SHALL be hidden

#### Scenario: Day rules are not found when no day-scope rules exist

- **WHEN** no active `scope=day` rules exist for a given parameter
- **THEN** the "Summe pro Tag" section SHALL still display using the built-in fallback rules (`NUTRITION_FALLBACKS`) as day rules

#### Scenario: Meal_event rules are not found when no meal_event-scope rules exist

- **WHEN** no active `scope=meal_event` rules exist for a given parameter
- **THEN** the "Durchschnitt pro Tag (Ø Plan)" section SHALL still display using the built-in fallback rules as meal_event rules

### Requirement: NutritionView day rules show per-day context labels

For each day in the "Summe pro Tag" section, each rule's `SollIstBar` SHALL receive a `scopeLabel` in the format "Summe Tag {N}" where N is the 1-indexed day number. The label SHALL include the formatted date for additional context.

#### Scenario: Day rule with scope label

- **WHEN** day 2 of a plan has an energy evaluation of 1800 kcal
- **AND** the formatted date is "Di 02.06"
- **THEN** the SollIstBar SHALL render with `scopeLabel="Summe Tag 2 (Di 02.06)"`

### Requirement: NutritionView meal_event rules show average context label

For each rule in the "Durchschnitt pro Tag (Ø Plan)" section, each rule's `SollIstBar` SHALL receive a `scopeLabel` in the format "Ø {N} Tage" where N is the number of days in the plan.

#### Scenario: Event rule with scope label

- **WHEN** a meal plan has 5 days and the energy average is 1880 kcal
- **THEN** the SollIstBar SHALL render with `scopeLabel="Ø 5 Tage"`

#### Scenario: Single-day plan average label

- **WHEN** a meal plan has only 1 day
- **THEN** the SollIstBar SHALL render with `scopeLabel="1 Tag"`
