# recipe-ingredient-review Specification

## Purpose
TBD - created by archiving change review-ai-recipe-ingredients. Update Purpose after archive.
## Requirements
### Requirement: Conditional ingredient review step
The recipe wizard SHALL show a dedicated ingredient review step immediately before `Zutaten` whenever an AI import or AI recipe action produces ingredient, portion, quantity, or replacement suggestions. The step SHALL be absent when no AI-derived ingredient data exists.

#### Scenario: AI import opens review
- **WHEN** an authenticated user imports a recipe with AI-derived ingredient data
- **THEN** the wizard SHALL show the review step before `Zutaten`

#### Scenario: Manual recipe has no review step
- **WHEN** an authenticated user creates a recipe without AI-derived ingredient data
- **THEN** the wizard SHALL not show the review step

### Requirement: Explicit row confirmation
Every review row SHALL require an explicit human confirmation before it is complete, including exact matches and unchanged AI suggestions. The row SHALL show original text, selected ingredient, portion, quantity, source, status, and a human-readable reason; technical matching details SHALL be expandable.

#### Scenario: Exact match requires confirmation
- **WHEN** the matcher returns an exact existing ingredient match
- **THEN** the row SHALL remain open until the user explicitly confirms it

#### Scenario: Row displays explanation
- **WHEN** a review row is rendered
- **THEN** it SHALL show a human-readable reason and SHALL provide matcher method, confidence, and candidates in expandable details

### Requirement: Human ingredient selection
The review UI SHALL allow the user to select an AI candidate, search for and select any other existing ingredient, add an extra ingredient, or state that no existing ingredient fits. A rejected suggestion SHALL remain unresolved until the user supplies a replacement or completes the row manually.

#### Scenario: User chooses another ingredient
- **WHEN** the user selects `Zutat ändern` and chooses a search result
- **THEN** the system SHALL replace the selected ingredient and generate new portion and quantity suggestions for explicit review

#### Scenario: User rejects without replacement
- **WHEN** the user rejects a suggestion without selecting or creating a replacement
- **THEN** the row SHALL remain incomplete and recipe save SHALL remain blocked

### Requirement: Temporary new ingredient review
When no existing ingredient fits, the system SHALL offer the existing ingredient editor populated with a complete AI enrichment draft. All supplied fields and every supplied portion SHALL be editable and explicitly confirmable. No ingredient or portion SHALL be persisted during the review.

#### Scenario: New ingredient draft is reviewed
- **WHEN** the user chooses `Neue Zutat erstellen`
- **THEN** the existing ingredient editor SHALL open with the AI draft and all editable details

#### Scenario: New ingredient is not persisted on cancel
- **WHEN** the user cancels the import before final recipe save
- **THEN** the temporary ingredient and portions SHALL be discarded

### Requirement: Final atomic persistence
The system SHALL allow final recipe save only when every row is explicitly confirmed and valid. Confirmed temporary ingredients and portions SHALL be created in the same atomic operation as the recipe and recipe items.

#### Scenario: Successful final save
- **WHEN** all review rows are confirmed and the user saves the recipe
- **THEN** the system SHALL persist the recipe, temporary ingredients, portions, and recipe items atomically

#### Scenario: Save failure preserves review
- **WHEN** final persistence fails
- **THEN** no partial data SHALL remain persisted, the local review state SHALL remain open, and the affected field SHALL show the reason when available

### Requirement: Bulk confirmation
The review step SHALL provide `Alle Vorschläge übernehmen`, which SHALL explicitly confirm every complete open row, including manually added rows, while leaving incomplete rows unresolved.

#### Scenario: Bulk confirmation succeeds for complete rows
- **WHEN** the user activates `Alle Vorschläge übernehmen`
- **THEN** all complete rows SHALL become confirmed and incomplete rows SHALL remain open

### Requirement: Navigation protection
The review flow SHALL warn before navigation or reload when it contains unsaved review state. If the user confirms leaving, all local review data SHALL be discarded.

#### Scenario: User leaves with unsaved review
- **WHEN** the user attempts to leave a dirty review and confirms the browser warning
- **THEN** the review state SHALL be discarded and no server data SHALL be created
