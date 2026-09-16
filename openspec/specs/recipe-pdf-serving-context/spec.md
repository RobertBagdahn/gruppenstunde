# recipe-pdf-serving-context Specification

## Purpose
TBD - created by archiving change fix-recipe-pdf-and-instructions. Update Purpose after archive.
## Requirements
### Requirement: PDF dialog selects target servings
The Food frontend SHALL let the user select a target serving count from 1 through 100 before opening a recipe PDF.

#### Scenario: User selects four servings
- **WHEN** the user selects `4` in the recipe PDF dialog
- **THEN** the opened URL SHALL include `servings=4`

#### Scenario: Invalid serving count
- **WHEN** a client sends a serving count below 1 or above 100
- **THEN** the API SHALL return HTTP 422

### Requirement: Export scales without persisting
The recipe PDF export SHALL scale quantities and nutrition values to the requested servings without changing the stored recipe or cached normalized values.

#### Scenario: Four-serving export
- **WHEN** a normalized recipe has `quantity=125 g` and the export requests `servings=4`
- **THEN** the PDF SHALL show `500 g`
- **THEN** the database recipe item SHALL remain `125 g`

#### Scenario: Default export
- **WHEN** no `servings` parameter is supplied
- **THEN** the export SHALL use one normalized serving
