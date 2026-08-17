## MODIFIED Requirements

### Requirement: URL-Import Creates Structured Steps

When importing recipes from external URLs or JSON, the system SHALL create structured `RecipeStep` records directly instead of storing transient `steps` data.

#### Scenario: Import recipe from URL with Gemini extraction
- **WHEN** user imports a recipe from a URL
- **THEN** system extracts title, ingredients, and steps via Gemini API, creates `RecipeItem` records, and creates `RecipeStep` records with ingredient assignments

#### Scenario: Parsed steps become `RecipeStep` records
- **WHEN** Gemini returns `{ steps: ["Step 1 text", "Step 2 text", ...] }`
- **THEN** system creates one `RecipeStep` per item with automatic ingredient linking based on content analysis

### Requirement: CookLang-Compatible Parsing (Future Option)

The import system SHALL support parsing CookLang-formatted recipe text into structured steps (future: optional Phase 2 feature, not MVP).

#### Scenario: Import from CookLang-formatted text
- **WHEN** user pastes CookLang-formatted recipe text into import dialog (future feature)
- **THEN** system parses CookLang syntax and creates `RecipeStep` + `RecipeStepIngredient` records

