## MODIFIED Requirements

### Requirement: Recipe creation wizard persists edits across steps
The recipe creation wizard SHALL persist the complete state of the active step before advancing. Ingredient changes, metadata including summary and description, and preparation-step changes MUST be sent to the server before navigation, and the wizard MUST remain on the current step when persistence fails.

#### Scenario: Ingredient edits are persisted before metadata navigation
- **WHEN** a user changes the recipe title, type, or ingredients and clicks `Weiter`
- **THEN** the ingredient state and recipe title/type SHALL be persisted before the metadata step becomes active

#### Scenario: Metadata summary and description are persisted before step navigation
- **WHEN** a user changes the short summary and Markdown description and clicks `Weiter`
- **THEN** the recipe update request SHALL contain both fields and the values SHALL be visible after reload

#### Scenario: Preparation edits are persisted exactly once
- **WHEN** a user changes a preparation instruction and clicks `Weiter`
- **THEN** exactly one batch step update SHALL contain the edited instruction before the preview step becomes active

#### Scenario: Failed persistence blocks navigation
- **WHEN** the active-step persistence request fails
- **THEN** the wizard SHALL remain on the active step, SHALL show the structured German error, and SHALL preserve the local edit for retry

### Requirement: Recipe creation import paths are deterministic and complete
The manual, AI, and enhanced URL-import paths SHALL preserve editable ingredients, metadata, preparation steps, servings semantics, and source metadata through completion and reload.

#### Scenario: AI-created draft supports subsequent manual edits
- **WHEN** a deterministic AI-created draft is returned and the user edits its ingredient or preparation data
- **THEN** the manual edits SHALL be persisted and SHALL not be replaced by stale AI response data

#### Scenario: Enhanced URL import preserves source metadata
- **WHEN** a deterministic enhanced import preview is confirmed
- **THEN** the created recipe SHALL retain the source URL, supported tags, detected servings semantics, imported items, and imported preparation steps

#### Scenario: Import failure does not create a partial recipe
- **WHEN** enhanced import returns a classified source or parsing error
- **THEN** the UI SHALL show the mapped German error and SHALL not navigate to a partially created recipe
