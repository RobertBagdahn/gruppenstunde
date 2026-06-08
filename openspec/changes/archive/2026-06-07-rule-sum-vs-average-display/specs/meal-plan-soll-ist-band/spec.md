## MODIFIED Requirements

### Requirement: Soll-Band fields in suggestions API

The suggestions API SHALL include `min_green`, `max_green`, and `target_mid` fields in the `SuggestionOut` schema. These fields MUST be populated for rule evaluations when the rule has green thresholds defined. For event-scope rules (`scope=meal_event`), only the `current_value` SHALL be normalized by dividing by the number of days in the meal plan (excluding `nutri_class`). The threshold values (`min_green`, `max_green`, `target_mid`) SHALL remain as their original per-day values and MUST NOT be divided by `num_days`.

#### Scenario: Rule evaluation outputs target bounds

- **WHEN** a suggestion is returned for a rule with `min_green = 2000` and `max_green = 2500`
- **THEN** the suggestions API response `SuggestionOut` SHALL contain `min_green` as 2000.0, `max_green` as 2500.0, and `target_mid` as 2250.0

#### Scenario: Event rules current value is normalized by days but thresholds are not

- **WHEN** an event-scope rule has `min_green = 2000`, `max_green = 2500` and the meal plan has 3 days with aggregated energy total 6000 kcal
- **THEN** the suggestions API response `SuggestionOut` SHALL return `current_value` as `2000.0` (6000 / 3)
- **THEN** the response SHALL return `min_green` as `2000.0` (unchanged) and `max_green` as `2500.0` (unchanged)
- **AND** `target_mid` SHALL be `2250.0` (unchanged)

## ADDED Requirements

### Requirement: SollIstBar shows scope context label

The `SollIstBar` component SHALL accept an optional `scopeLabel` prop of type `string`. When provided, the component SHALL render the label as a small, muted text above the "Ist/Soll" values. The label SHALL describe the evaluation context (e.g. "Summe Tag 3" or "Ø 5 Tage").

#### Scenario: SollIstBar with scope label

- **WHEN** SollIstBar is rendered with `scopeLabel="Summe Tag 3"`, `current=2100`, `min_green=1912`, `max_green=2629`
- **THEN** the label "Summe Tag 3" SHALL appear above the "Ist: 2100 kcal / Soll: 1912 - 2629 kcal" line
- **AND** the label SHALL use `text-xs text-muted-foreground` styling

#### Scenario: SollIstBar without scope label (backward compatible)

- **WHEN** SollIstBar is rendered without a `scopeLabel` prop
- **THEN** no label SHALL be rendered above the Ist/Soll line
- **AND** the component SHALL behave identically to before the change
