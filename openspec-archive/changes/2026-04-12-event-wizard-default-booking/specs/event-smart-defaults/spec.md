## MODIFIED Requirements

### Requirement: Default booking option with calculated price
The event creation form SHALL auto-generate a default booking option based on event dates.

#### Scenario: Default booking option creation
- **WHEN** both start date and end date are set (either manually or via auto-fill)
- **AND** no booking options have been manually added by the user
- **THEN** a default booking option SHALL be pre-filled with name "Teilnahme", price = number_of_days x 15 EUR, description "Standardbeitrag pro Tag"
- **THEN** the number of days SHALL be calculated as the difference in calendar days between start and end date (inclusive of both days)

#### Scenario: Price calculation examples
- **WHEN** start date is Saturday and end date is Sunday (2 days)
- **THEN** the default price SHALL be 30 EUR
- **WHEN** start date is Friday and end date is Sunday (3 days)
- **THEN** the default price SHALL be 45 EUR

#### Scenario: User has added custom booking options
- **WHEN** the user has manually added or modified booking options in step 5 (Buchungsoptionen)
- **THEN** the system SHALL NOT overwrite or add a default booking option

#### Scenario: Default booking option is editable
- **WHEN** the default booking option is auto-generated
- **THEN** the user SHALL be able to edit all fields (name, price, description, max_participants)
- **THEN** editing the default option SHALL mark it as manually edited (no further auto-updates)

#### Scenario: Date change updates auto-generated option
- **WHEN** the user changes start or end date after the default booking option was auto-generated
- **AND** the booking option has NOT been manually edited
- **THEN** the price SHALL be recalculated based on the new date range

#### Scenario: No dates set
- **WHEN** neither start date nor end date is set
- **THEN** no default booking option SHALL be created
