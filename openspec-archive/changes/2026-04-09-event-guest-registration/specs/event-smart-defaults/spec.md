## ADDED Requirements

### Requirement: Auto-fill end date from start date
The event creation form SHALL automatically set the end date when a start date is selected.

#### Scenario: Start date on a weekday
- **WHEN** the user selects a start date that is not a Sunday
- **AND** the end date field is empty or has not been manually edited
- **THEN** the end date SHALL be auto-filled with the next Sunday after the start date
- **THEN** the time component SHALL be set to 14:00

#### Scenario: Start date on a Sunday
- **WHEN** the user selects a start date that is a Sunday
- **AND** the end date field is empty or has not been manually edited
- **THEN** the end date SHALL be auto-filled with the same date (single-day event)

#### Scenario: User overrides auto-filled end date
- **WHEN** the user manually changes the auto-filled end date
- **THEN** the system SHALL NOT overwrite the user's choice on subsequent start date changes
- **THEN** the auto-fill SHALL only apply when the end date has not been manually edited

### Requirement: Auto-fill registration deadline from start date
The event creation form SHALL automatically set the registration deadline when a start date is selected.

#### Scenario: Registration deadline auto-fill
- **WHEN** the user selects a start date
- **AND** the registration deadline field is empty or has not been manually edited
- **THEN** the registration deadline SHALL be auto-filled with the Sunday before the start date
- **THEN** the time component SHALL be set to 23:59

#### Scenario: Start date is on a Sunday or Monday
- **WHEN** the user selects a start date that is a Sunday or Monday
- **AND** the registration deadline field is empty or has not been manually edited
- **THEN** the registration deadline SHALL be set to the Sunday 7 days before the start date

### Requirement: Default booking option with calculated price
The event creation form SHALL auto-generate a default booking option based on event dates.

#### Scenario: Default booking option creation
- **WHEN** both start date and end date are set (either manually or via auto-fill)
- **AND** no booking options have been manually added by the user
- **THEN** a default booking option SHALL be pre-filled with name "Standard", price = number_of_days x 10 EUR
- **THEN** the number of days SHALL be calculated as the difference in calendar days between start and end date (inclusive)

#### Scenario: Price calculation examples
- **WHEN** start date is Saturday and end date is Sunday (2 days)
- **THEN** the default price SHALL be 20 EUR
- **WHEN** start date is Friday and end date is Sunday (3 days)
- **THEN** the default price SHALL be 30 EUR

#### Scenario: User has added custom booking options
- **WHEN** the user has manually added or modified booking options in step 2 (Buchungsoptionen)
- **THEN** the system SHALL NOT overwrite or add a default booking option

#### Scenario: Default booking option is editable
- **WHEN** the default booking option is auto-generated
- **THEN** the user SHALL be able to edit all fields (name, price, description, max_participants)
- **THEN** editing the default option SHALL mark it as manually edited (no further auto-updates)
