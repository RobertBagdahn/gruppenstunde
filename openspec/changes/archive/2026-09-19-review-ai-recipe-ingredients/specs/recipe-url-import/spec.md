## MODIFIED Requirements

### Requirement: Recipe Import from URL Endpoint
The system SHALL provide an import endpoint that accepts one or more smart-input sources, including URLs and pasted recipe text, and returns a parsed recipe preview with reviewable ingredient candidates. The response SHALL include servings, preparation steps, source references, detected input type, reconstruction status, and all fields required by synchronized frontend schemas. Every recipe item SHALL carry a usable portion reference or an explicit clarification/review flag. The endpoint SHALL NOT persist a recipe, ingredient, or portion as a side effect of preview generation.

#### Scenario: Successful import returns review preview
- **WHEN** an authenticated user submits one or more valid recipe sources
- **THEN** the response SHALL include metadata, steps, reviewable recipe items, source references, and portion suggestions
- **THEN** no recipe, ingredient, or portion SHALL be persisted before final confirmation

#### Scenario: Pasted website content is accepted
- **WHEN** a user submits copied website content as a text source
- **THEN** the import SHALL parse the text and return the same review contract as URL import

#### Scenario: Successful import returns complete preview
- **WHEN** a user submits a URL containing valid recipe data
- **THEN** the response SHALL include servings, metadata, steps, recipe items, and created ingredients
- **THEN** each returned recipe item SHALL include a usable portion reference or an explicit clarification flag
- **THEN** no recipe item SHALL carry a null portion reference without that flag

#### Scenario: Successful import from schema.org JSON-LD
- **WHEN** a user submits a URL containing valid schema.org/Recipe JSON-LD markup
- **THEN** the system SHALL parse the structured data first
- **THEN** the preview SHALL contain title, description, servings, ingredients, steps, and durations when present

#### Scenario: Successful import via search grounding fallback
- **WHEN** the direct page fetch fails with a source error
- **THEN** the system SHALL attempt reconstruction via Gemini with Google Search Grounding
- **THEN** the response SHALL mark the result as reconstructed

#### Scenario: Import uses one canonical user-facing flow
- **WHEN** the user creates a recipe from a URL
- **THEN** the smart input field SHALL be the only user-facing entry point
- **THEN** no alternative import page SHALL exist

#### Scenario: Invalid or unreachable URL
- **WHEN** a user submits a malformed URL, or neither direct fetch nor grounding yields recipe data
- **THEN** the system SHALL return HTTP 422 with a German error message
- **THEN** no recipe draft SHALL be created

#### Scenario: Response contract matches the frontend schema
- **WHEN** the endpoint returns a successful response containing tags
- **THEN** the frontend Zod validation SHALL succeed without error

### Requirement: Ingredient Matching via Text Search and Gemini
The system SHALL match extracted ingredients against existing database entries using text search (icontains on name + aliases) as pre-filter, then Gemini for final matching decision. When no existing ingredient matches, the import SHALL return a complete temporary ingredient enrichment proposal for human review instead of creating an Ingredient immediately. The proposal SHALL include all fields required by the existing ingredient editor and SHALL remain temporary until final recipe save.

#### Scenario: Existing ingredient matched
- **WHEN** Gemini determines an extracted ingredient matches an existing Ingredient (based on top-5 text search candidates including aliases)
- **THEN** the system SHALL use the existing Ingredient ID in the recipe item and NOT create a duplicate

#### Scenario: No match found — new ingredient created
- **WHEN** Gemini determines no existing ingredient matches
- **THEN** the system SHALL return a temporary ingredient proposal instead of creating an Ingredient row

#### Scenario: No existing ingredient
- **WHEN** no existing ingredient is selected for an extracted name
- **THEN** the response SHALL provide an AI ingredient proposal marked as new and requiring review
- **THEN** no Ingredient row SHALL be created by the preview

#### Scenario: No match found — ingredient remains temporary
- **WHEN** Gemini determines no existing ingredient matches
- **THEN** the system SHALL return a temporary ingredient proposal without creating an Ingredient row

### Requirement: Preview Before Save
The system SHALL route imported ingredient data through the dedicated review step before recipe creation. The recipe SHALL be created only after every review row is explicitly confirmed and the user completes final save.

#### Scenario: User confirms imported ingredients
- **WHEN** every review row is valid and explicitly confirmed
- **THEN** the wizard SHALL allow final recipe save and persist the confirmed data atomically

#### Scenario: User cancels review
- **WHEN** the user cancels or confirms leaving before final save
- **THEN** no recipe, ingredient, portion, or recipe item SHALL be created

#### Scenario: User reviews and edits before saving
- **WHEN** the user confirms the URL import preview
- **THEN** the system SHALL keep the imported data available for review and editing before final save
