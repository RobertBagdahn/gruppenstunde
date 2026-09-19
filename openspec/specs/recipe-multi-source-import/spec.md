# recipe-multi-source-import Specification

## Purpose
TBD - created by archiving change review-ai-recipe-ingredients. Update Purpose after archive.
## Requirements
### Requirement: Combined import sources
The recipe import SHALL accept multiple URL and pasted-text sources and SHALL analyze them together as one import attempt. The UI SHALL allow adding another source after an extraction failure.

#### Scenario: URL and pasted text are combined
- **WHEN** an authenticated user submits one URL and one pasted recipe text
- **THEN** the import SHALL analyze both sources together and return one review set

#### Scenario: Failed import accepts another source
- **WHEN** the initial source cannot be parsed
- **THEN** the UI SHALL allow the user to add a URL or pasted text and retry analysis without silently saving a draft

### Requirement: Per-row provenance
Every extracted review row SHALL retain and display the URL or pasted-text source that produced it. Rows combining evidence from multiple sources SHALL display all relevant sources.

#### Scenario: Source is visible on row
- **WHEN** an extracted ingredient is shown in review
- **THEN** its source reference SHALL be visible on that row

### Requirement: Conflict review
When sources disagree about an ingredient, quantity, unit, or preparation, the system SHALL show the conflicting source values and may provide an AI recommendation. The recommendation SHALL require explicit human confirmation and no source SHALL win automatically.

#### Scenario: Conflicting quantities
- **WHEN** two sources provide different quantities for the same ingredient
- **THEN** the row SHALL show both source values, an optional AI recommendation, and an unresolved review status

### Requirement: Immutable raw source
The original extracted source text SHALL remain visible and unchanged during review. Editing the selected ingredient or quantity SHALL not overwrite the raw source value.

#### Scenario: User edits mapped value
- **WHEN** the user changes the selected ingredient or confirmed quantity
- **THEN** the original source text SHALL remain available as a read-only reference
