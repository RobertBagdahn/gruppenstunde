## ADDED Requirements

### Requirement: Liquid ingredients can be entered in milliliters
The system SHALL offer a "Milliliter" unit in the ingredient quantity dialog when the ingredient has a liquid viscosity (`liquid` or `beverage`), a density greater than 0, and a gram portion (the anchor for the conversion).

#### Scenario: Liquid ingredient with density
- **WHEN** the user opens the quantity dialog for an ingredient with viscosity `liquid` and density 0.92
- **THEN** the unit picker shows a "Milliliter" option

#### Scenario: Solid ingredient
- **WHEN** the user opens the quantity dialog for an ingredient with viscosity `solid`
- **THEN** the unit picker shows no "Milliliter" option

#### Scenario: Liquid ingredient without gram portion
- **WHEN** the ingredient has viscosity `liquid` and density 0.92 but no gram portion
- **THEN** the unit picker shows no "Milliliter" option

#### Scenario: Liquid ingredient without density
- **WHEN** the ingredient has viscosity `liquid` but no density
- **THEN** the unit picker shows no "Milliliter" option

### Requirement: Milliliter quantities are converted to grams with density
The system SHALL convert a milliliter quantity to grams as `ml × density` and store the result as the ingredient's gram quantity.

#### Scenario: Confirm 1300 ml of oil with density 0.92
- **WHEN** the user enters 1300 in the "Milliliter" unit for an oil with density 0.92 and confirms
- **THEN** the stored quantity is 1196 g

### Requirement: Conversion line is shown
The system SHALL show the conversion line in German number format, e.g. "1.300 ml × 0,92 g/ml = 1,2 kg", whenever a milliliter quantity is entered.

#### Scenario: Conversion line visible
- **WHEN** the user enters 1300 ml for an ingredient with density 0.92
- **THEN** the dialog shows "1.300 ml × 0,92 g/ml = 1,2 kg"

### Requirement: Density and viscosity are passed to the dialog
Both callers of the ingredient quantity dialog SHALL pass the ingredient's `physical_density` and `physical_viscosity`.

#### Scenario: Caller passes density
- **WHEN** the dialog is opened from the recipe ingredient review or the ingredient detail search
- **THEN** density and viscosity of the ingredient are available to the dialog
