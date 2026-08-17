## ADDED Requirements

### Requirement: Recipe URL Import Endpoint
The system SHALL provide a POST /api/recipes/import-from-url/ endpoint that accepts a JSON body with a `url` field and returns parsed recipe preview data.

#### Scenario: Successful import from Schema.org JSON-LD
- **WHEN** a user submits a URL containing valid Schema.org Recipe JSON-LD markup
- **THEN** the system SHALL return a preview object with title, ingredients, steps, servings, and image_url extracted from the structured data

#### Scenario: Successful import from Chefkoch fallback
- **WHEN** a user submits a Chefkoch URL that lacks JSON-LD but contains recipe HTML
- **THEN** the system SHALL fall back to Chefkoch-specific HTML parsing and return the same preview structure

#### Scenario: User confirms before saving
- **WHEN** the preview data is returned to the frontend
- **THEN** the system SHALL NOT create a recipe until the user explicitly confirms the import

#### Scenario: Invalid URL submitted
- **WHEN** a user submits a malformed or unreachable URL
- **THEN** the system SHALL return HTTP 422 with an error message indicating the URL is invalid or unreachable

#### Scenario: No recipe found on page
- **WHEN** a user submits a valid URL that contains no recognizable recipe data
- **THEN** the system SHALL return HTTP 422 with an error message indicating no recipe was found

#### Scenario: Parse error during extraction
- **WHEN** recipe data is found but cannot be fully parsed
- **THEN** the system SHALL return partial data where available and indicate which fields could not be extracted
