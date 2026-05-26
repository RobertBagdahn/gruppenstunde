## ADDED Requirements

### Requirement: CI seed data for groups
The system SHALL provide seed data (Django management command or fixture) that creates groups with fully configured corporate identities for development and testing purposes.

#### Scenario: Seed data creates groups with diverse CI
- **WHEN** the seed data command is executed
- **THEN** the system SHALL create at least 3 groups with distinct CI configurations:
  - "Stamm Windrose" — primary: `#2E7D32` (green), slogan: "Allzeit bereit!", full CI with all text fields
  - "Stamm Nordlicht" — primary: `#1565C0` (blue), slogan: "Immer vorwärts!", full CI with all text fields
  - "Stamm Feuerfuchs" — primary: `#E65100` (orange), slogan: "Gemeinsam stark!", full CI with all text fields

#### Scenario: Seed data includes realistic text blocks
- **WHEN** the seed data is created
- **THEN** each group's CI SHALL include realistic German text for all text fields:
  - `greeting_text`: formal greeting appropriate for scout group communication
  - `footer_text`: address, phone, email contact information
  - `payment_info`: bank account details (IBAN format with fictional data)
  - `signature_text`: group leader name and title

#### Scenario: Seed data is idempotent
- **WHEN** the seed data command is executed multiple times
- **THEN** the system SHALL update existing records rather than creating duplicates (using `update_or_create`)

#### Scenario: Seed data includes placeholder logos
- **WHEN** the seed data is created
- **THEN** each group SHALL have a programmatically generated placeholder logo (colored circle or initials) stored as a file, not requiring external downloads
