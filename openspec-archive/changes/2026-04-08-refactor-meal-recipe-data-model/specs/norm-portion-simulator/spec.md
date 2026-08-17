## MODIFIED Requirements

### Requirement: Norm person single calculation API
The system SHALL provide a REST endpoint `GET /api/norm-person/calculate` that calculates BMR, TDEE, and norm factor for a single person based on age, gender, and physical activity level (PAL). The calculation SHALL additionally return DGE recommended daily intake values for the given age/gender.

#### Scenario: Valid calculation with DGE reference
- **WHEN** a request is made to `GET /api/norm-person/calculate?age=15&gender=male&pal=1.5`
- **THEN** the system SHALL return HTTP 200 with `bmr`, `tdee`, `norm_factor`, `weight_kg`, `height_cm`, `age`, `gender`, `pal`
- **AND** the response SHALL additionally include `dge_energy_kcal`, `dge_protein_g`, `dge_fat_g`, `dge_carbohydrate_g`, `dge_fibre_g` from the static DGE reference data

#### Scenario: Default PAL value
- **WHEN** a request is made without the `pal` parameter
- **THEN** the system SHALL use `1.5` as the default PAL value

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated user makes a request to the endpoint
- **THEN** the system SHALL return the calculation result (no authentication required)

### Requirement: Norm person curves API for graph data
The system SHALL provide a REST endpoint `GET /api/norm-person/curves` that returns TDEE and norm factor data points for all ages (0-99), separated by male and female, for a given PAL value. The response SHALL additionally include DGE reference energy values per age group.

#### Scenario: Curves with DGE overlay data
- **WHEN** a request is made to `GET /api/norm-person/curves`
- **THEN** the system SHALL return HTTP 200 with:
  - `pal`: the PAL value used (default 1.5)
  - `reference`: object with the reference norm person details
  - `data_points`: array of 100 objects (ages 0-99), each containing `age`, `male_tdee`, `female_tdee`, `male_norm_factor`, `female_norm_factor`
  - `dge_reference`: array of DGE reference values per age group with `age_min`, `age_max`, `male_energy_kcal`, `female_energy_kcal`, `male_protein_g`, `female_protein_g`

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated user makes a request to the endpoint
- **THEN** the system SHALL return the curve data (no authentication required)

### Requirement: Norm portion simulator page
The system SHALL provide a frontend page at `/tools/norm-portion-simulator` that displays interactive charts for energy requirements and norm factors by age and gender, with DGE reference overlays.

#### Scenario: Page loads with default state and DGE overlay
- **WHEN** a user navigates to `/tools/norm-portion-simulator`
- **THEN** the page SHALL display:
  - A title "Normportion-Simulator"
  - A PAL selector with options for sedentary (1.2), moderate (1.5, selected by default), active (1.75), and very active (2.0)
  - An energy requirement chart (TDEE in kcal) with two lines (male/female) and DGE reference as shaded range
  - A norm factor chart with two lines (male/female)
  - A reference indicator showing the norm person (15 years, male, PAL 1.5)

#### Scenario: PAL selection updates charts
- **WHEN** the user selects a different PAL value
- **THEN** both charts and DGE overlays SHALL update
- **AND** the URL SHALL update to include the PAL parameter

#### Scenario: Mobile responsiveness
- **WHEN** the page is viewed on a mobile device (320px width)
- **THEN** the charts SHALL be responsive and readable
- **AND** the layout SHALL stack vertically
