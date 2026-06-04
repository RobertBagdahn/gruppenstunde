## MODIFIED Requirements

### Requirement: Extended HealthRules for cockpit
The system SHALL provide HealthRules for the cockpit dashboard covering macronutrients and vitamin_c_mg. To ensure visual indicators (Soll-Ist-Balken) are always rendered in the frontend, the system MUST use robust static DGE (Deutsche Gesellschaft für Ernährung) target value fallbacks for 13-18 year olds if database rules are empty or still loading.

#### Scenario: Day cockpit uses static fallback rules
- **WHEN** database rules are empty or loading and the user views the day nutrition dashboard
- **THEN** the cockpit SHALL display the target range comparison (SollIstBar) using the static DGE fallback guidelines

#### Scenario: Day cockpit uses database rules when available
- **WHEN** database rules are successfully loaded and the user views the day nutrition dashboard
- **THEN** the cockpit SHALL display the target range comparison (SollIstBar) using the loaded database rules

### Requirement: Nutrient balance chart with target values
The nutrient balance chart (NutrientBalanceChart) SHALL display side-by-side or grouped visual comparison between the actual nutrient intake (Ist) and the recommended target ranges/values (Soll). The chart MUST represent the target values for each displayed parameter (Eiweiß, Fett, Kohlenhydrate, Zucker, Ballaststoffe, Salz).

#### Scenario: Nutrient balance chart shows comparison
- **WHEN** the user views the nutrition tab
- **THEN** the NutrientBalanceChart SHALL render two separate bars/values for each nutrient parameter (one for Ist, one for Soll)

#### Scenario: Chart tooltip includes target ranges
- **WHEN** the user hovers over a nutrient column in the chart
- **THEN** the tooltip SHALL display both the actual value (Ist) and the recommended target/range value (Soll)
