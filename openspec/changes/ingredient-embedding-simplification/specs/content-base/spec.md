## MODIFIED Requirements

### Requirement: Embedding Generation Pipeline
The system SHALL generate text embeddings for all content items using `gemini-embedding-001` via Vertex AI. Embeddings SHALL be generated from a concatenation of title, summary, description, and tag names. For Recipe content, the embedding text SHALL additionally include human-readable serialization of all associated Ingredients (via RecipeItems → Portions → Ingredients) including their nutritional values, scores, and tags. Embeddings SHALL be stored as pgvector `VectorField` in each content table, using the dimension validated by the ingredient-embedding-simplification experiment (see design.md). The system SHALL request embeddings directly from the Vertex AI SDK (`google.genai`) with native dimensionality configuration (`output_dimensionality`) rather than via Cloud SQL's native `embedding()` SQL function, since the latter does not support dimension configuration.

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
- **THEN** the total embedding text SHALL stay within the model's input token limit

#### Scenario: Embedding not generated for drafts
- **WHEN** a content item is in 'draft' status
- **THEN** no embedding SHALL be generated (to save API costs)

#### Scenario: All existing embeddings recomputed on model change
- **WHEN** the embedding model or dimension configuration changes
- **THEN** a management command SHALL recompute embeddings for all existing content items across all content types (Ingredient, Recipe, Blog, Game, GroupSession) in bulk
- **THEN** no automatic rollback to the previous model/dimension SHALL be provided

### Requirement: EmbeddingFeedback Model
The system SHALL provide an `EmbeddingFeedback` model for tracking quality issues with embedding-based recommendations. Fields: content_link (FK to ContentLink), feedback_type (TextChoices: not_relevant/wrong_category/offensive), notes (TextField), created_by (FK to User), created_at (DateTimeField). The `content_link`'s referenced content types SHALL include `ingredient` in addition to the existing content types (groupsession, blog, game, recipe), in preparation for a future ingredient-specific feedback UI.

#### Scenario: Admin submits embedding feedback
- **WHEN** an admin marks an embedding-based recommendation as "not relevant"
- **THEN** an EmbeddingFeedback record SHALL be created
- **THEN** the associated ContentLink SHALL be marked as is_rejected=True

#### Scenario: Viewing feedback in admin
- **WHEN** an admin views the EmbeddingFeedback admin page
- **THEN** all feedback entries SHALL be listed with the source and target content titles

#### Scenario: Ingredient content type accepted
- **WHEN** the EmbeddingFeedback data model is inspected
- **THEN** `ingredient` SHALL be a valid content type value for feedback records, even though no dedicated ingredient feedback UI exists yet

### Requirement: Embedding Admin UI
The system SHALL provide an admin interface for viewing and managing embeddings. The admin SHALL display: embedding vector visualization (first 20 dimensions as bar chart), embedding_updated_at timestamp, calibrated percentage similarity to a reference item, bulk regeneration action.

#### Scenario: Viewing embeddings in admin
- **WHEN** an admin navigates to the embedding admin page
- **THEN** the page SHALL list all content items with their embedding status (has_embedding, embedding_updated_at)
- **THEN** the admin SHALL be able to filter by content type and embedding status

#### Scenario: Filtering by embedding similarity
- **WHEN** an admin selects a reference content item and clicks "Find Similar"
- **THEN** the admin SHALL see a sorted list of content items ranked by calibrated percentage similarity
- **THEN** each item SHALL show its similarity as a percentage (0% - 100%), not a raw cosine distance
