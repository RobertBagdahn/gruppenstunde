## ADDED Requirements

### Requirement: Embedding Admin View
The admin interface SHALL provide a dedicated "Embeddings" section for viewing and managing content embeddings across all content types.

#### Scenario: Embedding list view
- **WHEN** an admin navigates to the embeddings admin section
- **THEN** all content items SHALL be listed with: title, content_type, has_embedding (boolean), embedding_updated_at, similarity_to_reference (if reference selected)
- **THEN** the admin SHALL be able to filter by content_type and embedding status (has/missing)

#### Scenario: Embedding similarity explorer
- **WHEN** an admin selects a reference content item
- **THEN** all other content items SHALL be sorted by cosine similarity to the reference
- **THEN** each item SHALL show its similarity score (0.0 - 1.0)
- **THEN** the admin SHALL be able to identify clustering and quality issues

#### Scenario: Bulk embedding regeneration
- **WHEN** an admin selects multiple items and clicks "Embeddings neu generieren"
- **THEN** embeddings SHALL be regenerated for all selected items

### Requirement: Approval Queue Admin View
The admin interface SHALL provide an "Approval Queue" section showing all content with status='submitted'.

#### Scenario: Viewing pending approvals
- **WHEN** an admin navigates to the approval queue
- **THEN** submitted content SHALL be listed sorted by submission date (oldest first)
- **THEN** each item SHALL show: title, content_type badge, author, submission date, preview button

#### Scenario: Approving from queue
- **WHEN** an admin clicks "Genehmigen" on a submitted item
- **THEN** the content status SHALL change to 'approved'
- **THEN** an approval email SHALL be sent to the author
- **THEN** the item SHALL be removed from the queue

#### Scenario: Rejecting from queue
- **WHEN** an admin clicks "Ablehnen" on a submitted item
- **THEN** a dialog SHALL open requiring a rejection reason
- **THEN** the content status SHALL change to 'rejected'
- **THEN** a rejection email SHALL be sent to the author with the reason

### Requirement: EmbeddingFeedback Admin View
The admin interface SHALL provide a view for reviewing embedding quality feedback.

#### Scenario: Viewing feedback list
- **WHEN** an admin navigates to the embedding feedback section
- **THEN** all EmbeddingFeedback entries SHALL be listed with: source title, target title, feedback_type, notes, created_by, created_at
- **THEN** the admin SHALL be able to filter by feedback_type and date range

## MODIFIED Requirements

### Requirement: Admin Dashboard Statistics
The admin dashboard SHALL include statistics for all content types, not just Ideas.

#### Scenario: Content statistics overview
- **WHEN** an admin views the dashboard
- **THEN** statistics SHALL show: total content per type, pending approvals count, total embeddings, total content links, recent activity across all types

### Requirement: Admin Material/Ingredient Management
The admin SHALL provide management interfaces for both Material and Ingredient (Supply subtypes) with full CRUD, search, and filtering.

#### Scenario: Material admin
- **WHEN** an admin navigates to the Material admin
- **THEN** materials SHALL be listed with name, category, usage count, purchase link count
- **THEN** inline editing SHALL be available for all fields

#### Scenario: Ingredient admin
- **WHEN** an admin navigates to the Ingredient admin
- **THEN** ingredients SHALL be listed with name, nutri_score, is_standalone_food, usage count
- **THEN** the admin SHALL be able to trigger AI autocomplete for nutritional data
