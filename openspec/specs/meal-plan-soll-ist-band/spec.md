# meal-plan-soll-ist-band Specification

## Purpose
TBD - created by archiving change meal-plan-soll-ist-band. Update Purpose after archive.
## Requirements
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

### Requirement: Norm-Person als einziger Tagesbedarfs-Bezug

Das System SHALL die Norm-Person (`NORM_PERSON_DAILY_KCAL = 2335`, PAL 1.75) als einzigen
Bezugswert für den täglichen Energiebedarf verwenden. Die DGE-basierte Energie-Rule
(`seed_rules.py`, scope `day` und `meal_event`) MUST so gesetzt sein, dass ihr grünes Band
um 2335 kcal zentriert ist, damit Tagesplan-Soll und Nährwert-Bewertung denselben Zielpunkt
teilen.

#### Scenario: Energie-Rule um Norm-Person zentriert
- **WHEN** die Energie-Rule (scope day) ausgewertet wird
- **THEN** die Bandmitte (`target_mid = (min_green + max_green) / 2`) SHALL ≈ 2335 kcal sein

#### Scenario: Tagesplan-Soll und Nährwert-Ziel konsistent
- **WHEN** ein Tag exakt das Tagesplan-Soll (2335 kcal/Person) trifft
- **THEN** die Nährwert-Bewertung SHALL diesen Wert als zentral/grün einordnen

### Requirement: Sichtbare Tagesanteil-Überdeckung

Wenn die Summe der `day_part_factor` aller Mahlzeiten eines Tages 100% überschreitet, SHALL
das System diesen Zustand als Überdeckung sichtbar machen (eigener Badge-Zustand "Überplant"
in Warnfarbe) und NICHT still bei 100% deckeln. Die angezeigte Soll-kcal-Summe (die die
Überdeckung bereits einrechnet) und die Coverage-Badge MUST konsistent sein.

#### Scenario: Überplanter Tag wird gewarnt
- **WHEN** ein Tag Mahlzeiten mit zusammen 110% Tagesanteil hat (z.B. zwei zusätzliche Snacks)
- **THEN** die Tages-Badge SHALL "Überplant" (110%) in Warnfarbe anzeigen, nicht "Vollständig"

#### Scenario: Normaler Tag bleibt unverändert
- **WHEN** ein Tag Mahlzeiten mit zusammen ≤100% Tagesanteil hat
- **THEN** die Badge SHALL wie bisher Vollständig/Teilweise/Lückenhaft anzeigen

