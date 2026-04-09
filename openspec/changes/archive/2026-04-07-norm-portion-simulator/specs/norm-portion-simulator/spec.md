## ADDED Requirements

### Requirement: Norm person single calculation API
The system SHALL provide a REST endpoint `GET /api/norm-person/calculate` that calculates BMR, TDEE, and norm factor for a single person based on age, gender, and physical activity level (PAL).

#### Scenario: Valid calculation for male teenager
- **WHEN** a request is made to `GET /api/norm-person/calculate?age=15&gender=male&pal=1.5`
- **THEN** the system SHALL return HTTP 200 with a JSON response containing `bmr`, `tdee`, `norm_factor`, `weight_kg`, `height_cm`, `age`, `gender`, and `pal`
- **AND** `norm_factor` SHALL be `1.0` (since this matches the reference norm person)

#### Scenario: Valid calculation for female child
- **WHEN** a request is made to `GET /api/norm-person/calculate?age=8&gender=female&pal=1.5`
- **THEN** the system SHALL return HTTP 200 with a JSON response where `norm_factor` is less than `1.0`
- **AND** `weight_kg` and `height_cm` SHALL be looked up from the reference tables for an 8-year-old female

#### Scenario: Valid calculation with custom PAL
- **WHEN** a request is made to `GET /api/norm-person/calculate?age=25&gender=male&pal=2.0`
- **THEN** the system SHALL return HTTP 200 with `tdee` calculated as `bmr * 2.0`
- **AND** `norm_factor` SHALL be relative to the reference norm person (age 15, male, PAL 1.5)

#### Scenario: Invalid age parameter
- **WHEN** a request is made with `age=-1` or `age=100` or non-integer age
- **THEN** the system SHALL return HTTP 422 with a validation error

#### Scenario: Invalid gender parameter
- **WHEN** a request is made with `gender=other` or an unrecognized gender value
- **THEN** the system SHALL return HTTP 422 with a validation error

#### Scenario: Missing required parameters
- **WHEN** a request is made without `age` or `gender`
- **THEN** the system SHALL return HTTP 422 with a validation error

#### Scenario: Default PAL value
- **WHEN** a request is made without the `pal` parameter
- **THEN** the system SHALL use `1.5` as the default PAL value

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated user makes a request to the endpoint
- **THEN** the system SHALL return the calculation result (no authentication required)

---

### Requirement: Norm person curves API for graph data
The system SHALL provide a REST endpoint `GET /api/norm-person/curves` that returns TDEE and norm factor data points for all ages (0–99), separated by male and female, for a given PAL value.

#### Scenario: Curves with default PAL
- **WHEN** a request is made to `GET /api/norm-person/curves`
- **THEN** the system SHALL return HTTP 200 with:
  - `pal`: the PAL value used (default 1.5)
  - `reference`: object with the reference norm person details (age 15, male, PAL 1.5, tdee, norm_factor 1.0)
  - `data_points`: array of 100 objects (ages 0–99), each containing `age`, `male_tdee`, `female_tdee`, `male_norm_factor`, `female_norm_factor`

#### Scenario: Curves with custom PAL
- **WHEN** a request is made to `GET /api/norm-person/curves?pal=1.75`
- **THEN** the system SHALL return curve data where all TDEE values are calculated with PAL 1.75
- **AND** `norm_factor` values SHALL still be relative to the reference norm person (age 15, male, PAL 1.5)

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated user makes a request to the endpoint
- **THEN** the system SHALL return the curve data (no authentication required)

---

### Requirement: Norm portion simulator page
The system SHALL provide a frontend page at `/tools/norm-portion-simulator` that displays interactive charts for energy requirements and norm factors by age and gender.

#### Scenario: Page loads with default state
- **WHEN** a user navigates to `/tools/norm-portion-simulator`
- **THEN** the page SHALL display:
  - A title "Normportion-Simulator"
  - A PAL selector with options for sedentary (1.2), moderate (1.5, selected by default), active (1.75), and very active (2.0)
  - An energy requirement chart (TDEE in kcal) with two lines: male and female, across ages 0–99
  - A norm factor chart with two lines: male and female, across ages 0–99
  - A reference indicator showing the norm person (15 years, male, PAL 1.5) on the charts

#### Scenario: PAL selection updates charts
- **WHEN** the user selects a different PAL value (e.g., "Aktiv (1.75)")
- **THEN** both charts SHALL update to reflect the new PAL value
- **AND** the URL SHALL update to include `?pal=1.75`
- **AND** the reference norm person indicator SHALL remain at norm_factor 1.0

#### Scenario: URL-driven state restoration
- **WHEN** a user opens `/tools/norm-portion-simulator?pal=2.0`
- **THEN** the PAL selector SHALL show "Sehr aktiv (2.0)" as selected
- **AND** the charts SHALL display data for PAL 2.0

#### Scenario: Hover/tooltip on chart data points
- **WHEN** the user hovers over a data point in a chart
- **THEN** a tooltip SHALL display the exact values: age, TDEE (or norm factor), and gender

#### Scenario: Mobile responsiveness
- **WHEN** the page is viewed on a mobile device (320px width)
- **THEN** the charts SHALL be responsive and readable
- **AND** the layout SHALL stack vertically

---

### Requirement: Single person calculator
The simulator page SHALL include a calculator section where users can input age, gender, and activity level to get a detailed norm factor calculation for a single person.

#### Scenario: Calculate norm factor for a specific person
- **WHEN** the user enters age 12, selects female, and PAL 1.5
- **THEN** the system SHALL display: BMR, TDEE, norm factor, reference weight, and reference height
- **AND** the norm factor SHALL indicate how this person compares to the reference norm person

#### Scenario: Calculator updates on input change
- **WHEN** the user changes any input (age, gender, or PAL)
- **THEN** the calculation results SHALL update immediately (debounced API call or reactive update)

---

### Requirement: Reference norm person display
The simulator page SHALL display the definition of the reference norm person prominently.

#### Scenario: Reference norm person info visible
- **WHEN** the page loads
- **THEN** an info section SHALL display: "Referenz-Normperson: 15 Jahre, männlich, PAL 1.5"
- **AND** it SHALL explain that a norm factor of 1.0 equals the reference person's energy needs

---

### Requirement: Navigation integration
The norm portion simulator SHALL be accessible from the tools navigation.

#### Scenario: Tools navigation link
- **WHEN** a user views the tools section
- **THEN** there SHALL be a link/card for "Normportion-Simulator" that navigates to `/tools/norm-portion-simulator`
