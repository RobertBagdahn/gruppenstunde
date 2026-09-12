# breakfast-single-screen-builder Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: 1-Screen Breakfast Builder Layout
The system SHALL provide a consolidated single-screen builder (`BreakfastQuickBuilder`) with four structured item sections: "Brot & Basis", "Aufstriche & Belag", "Frisches & Extras", and "Getränke".

#### Scenario: Opening breakfast builder
- **WHEN** user chooses to configure a breakfast meal slot
- **THEN** builder displays all four component categories simultaneously in an intuitive multi-column layout on a single screen

### Requirement: Automatic Standard Servings Calculation
When ingredients or components are toggled in the breakfast builder, the system SHALL calculate quantities automatically based on standard portion weights multiplied by the plan's person count.

#### Scenario: Toggling a breakfast item
- **WHEN** user checks "Mischbrot" for a group of 25 persons
- **THEN** system automatically suggests and sets the calculated total quantity (e.g., 1.8 kg) without requiring manual gram calculation

### Requirement: Optional Expert Mode Toggle
The builder SHALL include an expandable toggle for "DGE-Nährwert-Feinjustierung (Expertenmodus)" to view nutrient breakdowns and adjust custom distribution factors only when needed.

#### Scenario: Accessing expert nutrient distribution
- **WHEN** user clicks on the expert mode toggle
- **THEN** detailed calorie density and macro-nutrient sliders expand inline below the builder sections
