## MODIFIED Requirements

### Requirement: Source URL Storage
The system SHALL store the original import URL on the Recipe model in a `source_url` field when the user saves an imported draft.

#### Scenario: Source URL persisted
- **WHEN** a recipe draft created from a URL is saved
- **THEN** the Recipe.source_url field SHALL contain the original URL

#### Scenario: Editing a draft does not replace the source
- **WHEN** the user changes title or ingredients before saving an imported draft
- **THEN** the original import URL SHALL remain unchanged
