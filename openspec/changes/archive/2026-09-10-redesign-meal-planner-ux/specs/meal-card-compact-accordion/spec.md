## ADDED Requirements

### Requirement: Compact Meal Card Default State
A filled meal card in DayPlanView SHALL display in its collapsed state: meal title, start time, target servings count, cost per person, total cost, and up to four ingredient summary tags.

#### Scenario: Displaying collapsed card information
- **WHEN** user views a scheduled meal slot with a recipe
- **THEN** card renders title, time, servings count, price badges, and up to four tag chips for prominent ingredients without showing the full ingredient list

### Requirement: Inline Accordion Expansion
Clicking a meal card SHALL toggle an inline accordion area showing detailed ingredients with portion quantities, nutritional summary bars (DGE compliant), and quick action controls.

#### Scenario: Expanding meal details inline
- **WHEN** user clicks on a meal card
- **THEN** card expands downward smoothly to display ingredients, nutritional details, and portion configuration without opening a full-page dialog

### Requirement: Cleartext Servings Input
The meal card edit area SHALL allow users to view and update portions directly as group participant count ("Portionen für X Personen") rather than a decimal multiplier factor.

#### Scenario: Updating portions for a recipe
- **WHEN** user changes the portion count from 20 to 25 persons and saves
- **THEN** system automatically calculates the appropriate recipe factor in the background and updates the meal item
