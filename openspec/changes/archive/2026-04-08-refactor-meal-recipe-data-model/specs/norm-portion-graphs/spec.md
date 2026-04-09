## ADDED Requirements

### Requirement: DGE reference data as static Python data
The system SHALL store DGE (Deutsche Gesellschaft fuer Ernaehrung) reference values as static Python dictionaries in `backend/supply/data/dge_reference.py`. The data SHALL include recommended daily intake for energy (kJ/kcal), protein (g), fat (g), carbohydrate (g), and fibre (g), indexed by age group and gender.

#### Scenario: DGE data structure
- **WHEN** the DGE reference data is loaded
- **THEN** it SHALL provide values for age groups: 0-1, 1-4, 4-7, 7-10, 10-13, 13-15, 15-19, 19-25, 25-51, 51-65, 65+
- **THEN** each age group SHALL have separate values for male and female
- **THEN** the base values SHALL assume PAL 1.4 (DGE standard)

### Requirement: DGE reference API endpoint
The system SHALL provide a REST endpoint `GET /api/norm-person/dge-reference/` that returns all DGE reference values for graph rendering.

#### Scenario: Retrieve DGE reference data
- **WHEN** a GET request is made to `/api/norm-person/dge-reference/`
- **THEN** the system SHALL return all age groups with male and female values for each nutrient
- **THEN** the response SHALL include energy_kcal, protein_g, fat_g, carbohydrate_g, fibre_g per group

#### Scenario: DGE data with custom PAL
- **WHEN** a GET request is made to `/api/norm-person/dge-reference/?pal=1.75`
- **THEN** the energy values SHALL be scaled proportionally from the base PAL (1.4) to the requested PAL
- **THEN** macronutrient values SHALL remain unchanged (PAL only affects energy)

#### Scenario: Publicly accessible
- **WHEN** an unauthenticated user requests the endpoint
- **THEN** the system SHALL return the data (no authentication required)

### Requirement: Norm portion comparison graphs
The norm portion simulator page SHALL display comparison graphs showing Ist (actual from a MealEvent) vs. Soll (DGE recommended) values.

#### Scenario: Ist vs. Soll comparison for a MealEvent
- **WHEN** a user opens the norm portion simulator with a MealEvent context (e.g., `?meal-event-id=123`)
- **THEN** the page SHALL show additional graphs comparing:
  - Actual daily average energy vs. DGE recommended energy
  - Actual macronutrient distribution vs. DGE recommended distribution
- **THEN** the comparison SHALL use the MealEvent's norm_portions and activity_factor

#### Scenario: No MealEvent context
- **WHEN** the simulator is opened without a MealEvent context
- **THEN** only the standard graphs (TDEE curves, norm factor curves) SHALL be displayed
- **THEN** no Ist vs. Soll comparison SHALL be shown

### Requirement: Interactive age/gender graphs with DGE overlay
The simulator page SHALL show DGE recommended values as an overlay on the existing TDEE/norm-factor charts.

#### Scenario: DGE overlay on energy chart
- **WHEN** the energy chart is displayed
- **THEN** DGE recommended energy values SHALL be shown as a shaded range (min-max per age group)
- **THEN** the TDEE calculated line SHALL be overlaid on top
- **THEN** areas where TDEE exceeds DGE recommendation SHALL be visually highlighted

#### Scenario: Activity factor interaction
- **WHEN** the user changes the PAL selector
- **THEN** both the TDEE line and the DGE energy overlay SHALL update
- **THEN** DGE energy values SHALL be scaled to match the selected PAL

### Requirement: Nutrient breakdown graph
The simulator page SHALL include a macronutrient breakdown graph showing recommended distribution by age and gender.

#### Scenario: Macronutrient distribution chart
- **WHEN** the simulator page loads
- **THEN** a stacked bar chart SHALL show the recommended macronutrient distribution (protein %, fat %, carbohydrate %) per age group
- **THEN** separate bars SHALL be shown for male and female

#### Scenario: Mobile responsiveness
- **WHEN** viewed on mobile (320px)
- **THEN** graphs SHALL stack vertically and be scrollable
- **THEN** touch interactions SHALL work for tooltips and data point selection
