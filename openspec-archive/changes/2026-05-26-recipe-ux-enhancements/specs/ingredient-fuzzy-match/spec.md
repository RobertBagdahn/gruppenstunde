## ADDED Requirements

### Requirement: Ingredient Fuzzy Match API
The system SHALL provide GET /api/ingredients/suggest/?q=<text> that returns ranked ingredient matches using PostgreSQL pg_trgm similarity.

#### Scenario: Successful fuzzy match
- **WHEN** a user queries with a text that has similar ingredients in the database
- **THEN** the system SHALL return up to 5 matches ranked by similarity score

#### Scenario: Alias included in search
- **WHEN** a user queries with text matching an IngredientAlias rather than the canonical name
- **THEN** the system SHALL include that ingredient in results with the alias similarity score

#### Scenario: Similarity threshold filtering
- **WHEN** a user queries with text
- **THEN** the system SHALL only return matches with similarity > 0.3

#### Scenario: No matches found
- **WHEN** a user queries with text that has no similar ingredients (all below 0.3)
- **THEN** the system SHALL return an empty list

### Requirement: Frontend Unknown Ingredient Dialog
The frontend SHALL show a confirmation dialog when a user enters an ingredient name that does not exactly match any existing ingredient during recipe item creation.

#### Scenario: Unknown ingredient entered
- **WHEN** a user types an ingredient name with no exact match while creating a recipe item
- **THEN** the frontend SHALL display a dialog showing fuzzy suggestions and options to select a match or create a new ingredient
