## ADDED Requirements

### Requirement: Embedding Generation Pipeline
The system SHALL generate 768-dimensional text embeddings for all content items using Gemini text-embedding-001. Embeddings SHALL be generated from a concatenation of title, summary, description, and tag names. Embeddings SHALL be stored as pgvector VectorField(768) in each content table.

#### Scenario: Embedding generated on content creation
- **WHEN** a new content item is created with status 'approved' or 'submitted'
- **THEN** an embedding SHALL be generated and stored in the embedding field
- **THEN** the embedding_updated_at field SHALL be set to the current UTC timestamp

#### Scenario: Embedding updated on content modification
- **WHEN** a content item's title, summary, description, or tags are modified
- **THEN** the embedding SHALL be regenerated
- **THEN** old ContentLinks with link_type='embedding' SHALL be refreshed

#### Scenario: Embedding not generated for drafts
- **WHEN** a content item is in 'draft' status
- **THEN** no embedding SHALL be generated (to save API costs)

### Requirement: Cross-Type Similarity Search
The system SHALL find similar content items across all content types using cosine similarity on embeddings. The system SHALL query all content tables and merge results by similarity score.

#### Scenario: Finding similar content
- **WHEN** GET `/api/content/{type}/{id}/similar/` is called
- **THEN** the system SHALL return the top 12 most similar content items across all content types
- **THEN** results SHALL be sorted by cosine similarity descending
- **THEN** results SHALL exclude soft-deleted and non-approved content

### Requirement: Embedding Admin UI
The system SHALL provide an admin interface for viewing and managing embeddings. The admin SHALL display: embedding vector visualization (first 20 dimensions as bar chart), embedding_updated_at timestamp, similarity to a reference item, bulk regeneration action.

#### Scenario: Viewing embeddings in admin
- **WHEN** an admin navigates to the embedding admin page
- **THEN** the page SHALL list all content items with their embedding status (has_embedding, embedding_updated_at)
- **THEN** the admin SHALL be able to filter by content type and embedding status

#### Scenario: Filtering by embedding similarity
- **WHEN** an admin selects a reference content item and clicks "Find Similar"
- **THEN** the admin SHALL see a sorted list of content items ranked by cosine similarity
- **THEN** each item SHALL show its similarity score (0.0 - 1.0)

#### Scenario: Bulk regenerate embeddings
- **WHEN** an admin selects multiple content items and clicks "Embeddings neu generieren"
- **THEN** embeddings SHALL be regenerated for all selected items
- **THEN** a progress indicator SHALL show the regeneration status

### Requirement: Embedding Quality Feedback
The system SHALL allow admins to mark embedding-based recommendations as "not relevant" and store this feedback for quality improvement. The admin SHALL be able to view all feedback entries and filter by content type.

#### Scenario: Marking a recommendation as not relevant
- **WHEN** an admin views a content detail page and sees an irrelevant embedding recommendation
- **THEN** the admin SHALL be able to click a "Nicht passend" button on the recommendation
- **THEN** the system SHALL create an EmbeddingFeedback record and reject the ContentLink

#### Scenario: Viewing embedding feedback in admin
- **WHEN** an admin navigates to the embedding feedback admin page
- **THEN** all feedback entries SHALL be listed with source, target, feedback type, and creation date
- **THEN** the admin SHALL be able to filter by feedback type and date range
