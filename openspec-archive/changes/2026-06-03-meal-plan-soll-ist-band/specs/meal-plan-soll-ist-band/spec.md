# meal-plan-soll-ist-band Specification

## ADDED Requirements

### Requirement: Soll-Band fields in suggestions API
The suggestions API SHALL include `min_green`, `max_green`, and `target_mid` fields in the `SuggestionOut` schema. These fields MUST be populated for rule evaluations when the rule has green thresholds defined. For event-scope rules (evaluated as daily averages), these values MUST be normalized by dividing by the number of days in the meal plan (excluding `nutri_class`).

#### Scenario: Rule evaluation outputs target bounds
- **WHEN** a suggestion is returned for a rule with `min_green = 2000` and `max_green = 2500`
- **THEN** the suggestions API response `SuggestionOut` SHALL contain `min_green` as 2000.0, `max_green` as 2500.0, and `target_mid` as 2250.0

#### Scenario: Event rules are normalized by days
- **WHEN** an event-scope rule has `min_green = 2000` and the meal plan has 3 days
- **THEN** the suggestions API response `SuggestionOut` SHALL return `min_green` as `2000 / 3 ≈ 666.67` and `target_mid` as `min_green / 3`

### Requirement: Relative progress bar component in UI
The frontend SHALL provide a reusable `SollIstBar` component which renders the current value against target limits. The component MUST color the progress indicator in accordance with the evaluation status (`green`, `yellow`, `red`).

#### Scenario: SollIstBar renders target bounds and status color
- **WHEN** the `SollIstBar` is rendered with `current = 1800`, `min_green = 2000`, `max_green = 2500` and `status = yellow`
- **THEN** the progress indicator is displayed in yellow, representing 1800 relative to the midpoint target of 2250

### Requirement: Budget evaluation integration
The system SHALL treat the meal plan's daily budget per person as an upper limit (`max_green` / `max_yellow`). The suggestions service and budget checks MUST output `current_value`, `max_green`, and `target_mid` for budget assessments.

#### Scenario: Budget evaluation returns bounds
- **WHEN** a meal plan has a daily budget of 6.50€ and actual cost is 7.20€
- **THEN** the suggestions response SHALL set `current_value` to 7.20, `max_green` to 6.50, `target_mid` to 6.50, and `status` to `red`
