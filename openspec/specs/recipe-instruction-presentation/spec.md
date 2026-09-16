# recipe-instruction-presentation Specification

## Purpose
TBD - created by archiving change fix-recipe-pdf-and-instructions. Update Purpose after archive.
## Requirements
### Requirement: Description and structured steps are separate sections
Recipe detail, edit and PDF views SHALL label free Markdown content as `Beschreibung` and structured instructions as `Zubereitungsschritte`.

#### Scenario: Recipe with both fields
- **WHEN** a recipe has a description and structured steps
- **THEN** both sections SHALL be rendered with their distinct labels

#### Scenario: Read-only structured steps
- **WHEN** a viewer without edit permission opens a recipe containing structured steps
- **THEN** the structured steps SHALL be visible
- **THEN** edit controls SHALL remain hidden

### Requirement: Structured step fallback
Consumers SHALL prefer structured steps and SHALL fall back to Markdown description parsing when no structured steps exist.

#### Scenario: Legacy recipe
- **WHEN** a recipe has no RecipeStep rows but has Markdown description
- **THEN** the consumer SHALL render parsed description steps

#### Scenario: Empty recipe
- **WHEN** a recipe has neither structured steps nor description
- **THEN** the consumer SHALL show a German empty state
