# content-base Delta Specification

## MODIFIED Requirements

### Requirement: Embedding Generation Pipeline
The system SHALL generate 768-dimensional text embeddings for all content items using `text-embedding-004`. Embeddings SHALL be generated from a concatenation of title, summary, description, and tag names. For Recipe content, the embedding text SHALL additionally include human-readable serialization of all associated Ingredients (via RecipeItems → Portions → Ingredients) including their nutritional values, scores, and tags.

#### Scenario: Embedding generated on content creation
- **WHEN** a new content item is created with status 'approved' or 'submitted'
- **THEN** an embedding SHALL be generated and stored in the embedding field
- **THEN** the embedding_updated_at field SHALL be set to the current UTC timestamp

#### Scenario: Embedding updated on content modification
- **WHEN** a content item's title, summary, description, or tags are modified
- **THEN** the embedding SHALL be regenerated
- **THEN** old ContentLinks with link_type='embedding' SHALL be refreshed

#### Scenario: Recipe embedding includes ingredient data
- **WHEN** a Recipe embedding is generated
- **THEN** the embedding text SHALL include the names and nutritional profiles of all its Ingredients
- **THEN** each Ingredient SHALL be represented with up to 150 characters of structured nutritional text
- **THEN** the total embedding text SHALL stay within the 2048-token input limit

#### Scenario: Embedding not generated for drafts
- **WHEN** a content item is in 'draft' status
- **THEN** no embedding SHALL be generated (to save API costs)
