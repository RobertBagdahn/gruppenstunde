# meal-plan-ui-polish Specification

## Purpose
TBD - created by archiving change meal-plan-ui-polish. Update Purpose after archive.
## Requirements
### Requirement: Human-Readable PAL Level Labels
The system SHALL map Physical Activity Level (PAL) numeric ranges to descriptive German labels and display them to the user.
- A PAL factor <= 1.29 SHALL map to "Ruhend" (e.g., "Kaum körperliche Aktivität").
- A PAL factor from 1.30 to 1.59 SHALL map to "Moderat" (e.g., "Normale Pfadfinder-Aktivität").
- A PAL factor from 1.60 to 1.89 SHALL map to "Aktiv" (e.g., "Wanderung, Geländespiel").
- A PAL factor >= 1.90 SHALL map to "Sehr aktiv" (e.g., "Hajk, intensives Lager").

The system SHALL display this human-readable label alongside the raw PAL value in the meal plan detail header, the Settings Panel, and the Norm Portion Simulator.

#### Scenario: Displaying human-readable activity level
- **WHEN** a user views a meal plan with an activity factor of 1.75
- **THEN** the header displays "Aktiv (PAL 1,75)"

### Requirement: PAL Level Selector
The Settings Panel in the meal plan detail view SHALL replace the raw number input for the activity factor (PAL) with a select dropdown of standard activity levels based on the PAL mapping, while supporting fallback display for custom/non-standard factors.

#### Scenario: Selecting activity level from options
- **WHEN** a user opens the settings panel and changes the activity level dropdown from "Moderat (1,5)" to "Aktiv (1,75)" and saves
- **THEN** the activity factor of the meal plan is updated to 1.75

### Requirement: Table View Daily Totals ("Tagessummen-Zeile")
The planning Table View SHALL display a dedicated daily summary row ("Tagessumme") at the bottom of the table. For each date column, the system SHALL dynamically aggregate and display:
- The daily energy total in kcal (sum of item energies in kcal, treating external meals with their manual kcal input).
- The daily cost total in € (sum of all item costs).

#### Scenario: Displaying daily total aggregates
- **WHEN** a user views the meal plan table for a day with three meals totaling 2200 kcal and 8,50 €
- **THEN** the summary row at the bottom of that day's column displays "2200 kcal" and "8,50 €"

### Requirement: Nutrition Cockpit Day-by-Day Selector ("Bar7-Style")
The Nutrition View SHALL feature a horizontal day selector (composed of clickable buttons/badges for each day) and a leading "Gesamt" (All Days) button.
- Clicking the "Gesamt" button SHALL display aggregated nutrition averages for the entire timeframe.
- Clicking a specific day button SHALL load and display nutrition values specifically filtered for that individual day.

#### Scenario: Toggling day-specific nutrition data
- **WHEN** a user clicks the "Di 04.06." button in the horizontal day selector
- **THEN** the nutrition cockpit displays averages and Soll/Ist bars specifically for Tuesday, June 4th
