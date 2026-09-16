## MODIFIED Requirements

### Requirement: MatchResult API Exposure
The system SHALL expose replacement context in addition to existing MatchResult fields: `replacement_for_item_id`, `replacement_reason`, and `replacement_confidence` when a generic-to-concrete mapping applies.

#### Scenario: Replacement result exposed
- **WHEN** matching `Jodsalz` against a recipe containing mapped `Salz`
- **THEN** the API SHALL expose the candidate ingredient, replacement metadata and confidence

#### Scenario: Normal result unchanged
- **WHEN** no replacement mapping applies
- **THEN** the existing match fields SHALL remain available and replacement fields SHALL be null
