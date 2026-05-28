## ADDED Requirements

### Requirement: Quantity rounding by magnitude
The system SHALL round displayed quantities upward based on the magnitude of the value:
- Values < 2: round up to nearest 0.1
- Values 2–10: round up to nearest 1
- Values 10–1000: round up to nearest 5
- Values >= 1000: round up to nearest 100

This applies only to units g, kg, ml, l. All other units (Stück, EL, TL, Prise, etc.) SHALL be displayed without rounding.

#### Scenario: Value below 2
- **WHEN** a quantity of 0.73 g is displayed
- **THEN** the system shows "0,8 g"

#### Scenario: Value between 2 and 10
- **WHEN** a quantity of 3.2 g is displayed
- **THEN** the system shows "4 g"

#### Scenario: Value between 10 and 1000
- **WHEN** a quantity of 142 g is displayed
- **THEN** the system shows "145 g"

#### Scenario: Value at or above 1000
- **WHEN** a quantity of 1050 g is displayed
- **THEN** the system shows "1,1 kg" (rounded up to nearest 100g, displayed as kg)

#### Scenario: Non-weight/volume unit unchanged
- **WHEN** a quantity of 2.5 Stück is displayed
- **THEN** the system shows "2,5 Stück" without rounding

### Requirement: Automatic unit conversion at threshold
The system SHALL convert g to kg when the value is >= 1000 g, and ml to l when the value is >= 1000 ml. The rounding (to nearest 100) applies after conversion to the base unit.

#### Scenario: Grams to kilograms
- **WHEN** a quantity of 1875 g is displayed
- **THEN** the system shows "1,9 kg"

#### Scenario: Milliliters to liters
- **WHEN** a quantity of 2300 ml is displayed
- **THEN** the system shows "2,3 l"

#### Scenario: Below threshold stays in base unit
- **WHEN** a quantity of 980 g is displayed
- **THEN** the system shows "980 g"

### Requirement: Internal calculations remain exact
The system SHALL store and compute with exact (unrounded) values. Rounding is applied only at the display layer and MUST NOT affect stored data, API responses, or intermediate calculations.

#### Scenario: Scaling preserves precision
- **WHEN** a recipe with 15g pepper for 8 servings is scaled to 1 serving
- **THEN** the internal value is 1.875 and the display shows "1,9 g"

### Requirement: German number formatting
The system SHALL use German locale formatting for displayed quantities: comma as decimal separator, no thousands separator.

#### Scenario: Decimal display
- **WHEN** a rounded value of 1.9 kg is displayed
- **THEN** the system shows "1,9 kg" (comma as decimal separator)
