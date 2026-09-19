## MODIFIED Requirements

### Requirement: Human-in-the-Loop
The system SHALL trigger human intervention for grey-zone matches, multiple close matches, and complete misses. The response SHALL show up to five candidates, confidence, matching method, and a human-readable reason. The matcher SHALL return unresolved preview data for complete misses and SHALL NOT create an Ingredient as a side effect.

#### Scenario: Grey zone triggers dialog with top 5
- **WHEN** confidence falls in the grey zone and no candidate exceeds its stage threshold
- **THEN** the system SHALL return `needs_review=true` with up to five candidates and explanation data

#### Scenario: Multiple matches trigger dialog
- **WHEN** multiple candidates exceed a stage threshold with a score difference below the configured limit
- **THEN** the system SHALL return `needs_review=true` with all relevant candidates and require user selection

#### Scenario: Complete miss returns unresolved preview
- **WHEN** no candidate is found by any algorithmic stage
- **THEN** the system SHALL return `needs_review=true` with empty or generated candidates and a new-ingredient option
- **THEN** the matcher SHALL not create a database row

#### Scenario: Complete miss triggers dialog
- **WHEN** no candidate is found by any algorithmic stage
- **THEN** the system SHALL return `needs_review=true` with empty suggestions and the Frontend SHALL open the existing ingredient search dialog

#### Scenario: User accepts suggestion
- **WHEN** the user selects a candidate from the review UI
- **THEN** the system SHALL use the user's choice for the pending recipe item

### Requirement: MatchResult API Exposure
The system SHALL expose ingredient ID, name, confidence, matching method, note, new flag, review flag, candidates, and replacement context in review responses. It SHALL also expose a human-readable reason and technical details sufficient for the UI to explain why a candidate was proposed.

#### Scenario: Successful match exposed
- **WHEN** a stage finds a match
- **THEN** the API SHALL include the matching method, confidence, candidates where relevant, and explanation

#### Scenario: Needs review exposed
- **WHEN** the matcher triggers human review
- **THEN** the API SHALL include `needs_review=true` and the data required for manual selection without persisting a new ingredient

#### Scenario: Replacement result exposed
- **WHEN** matching `Jodsalz` against a recipe containing mapped `Salz`
- **THEN** the API SHALL expose the candidate ingredient, replacement metadata and confidence

#### Scenario: Normal result unchanged
- **WHEN** no replacement mapping applies
- **THEN** the existing match fields SHALL remain available and replacement fields SHALL be null
