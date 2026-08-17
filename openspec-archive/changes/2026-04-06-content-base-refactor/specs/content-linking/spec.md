## ADDED Requirements

### Requirement: Generic ContentLink Model
The system SHALL provide a `ContentLink` model that enables linking between any two content items across all content types. The model SHALL use Django's ContentType framework for polymorphic source and target references. Fields: source_content_type (FK to ContentType), source_object_id (PositiveIntegerField), target_content_type (FK to ContentType), target_object_id (PositiveIntegerField), link_type (TextChoices: manual/embedding/ai_suggested), relevance_score (FloatField, nullable), is_rejected (BooleanField), created_by (FK to User, nullable), created_at (DateTimeField).

#### Scenario: Manual content linking
- **WHEN** an author or admin links a GroupSession to a Recipe
- **THEN** a ContentLink SHALL be created with link_type='manual' and the current user as created_by

#### Scenario: Embedding-based linking
- **WHEN** the embedding service finds similar content across types
- **THEN** ContentLinks SHALL be created with link_type='embedding' and the cosine similarity as relevance_score

#### Scenario: Rejecting a link suggestion
- **WHEN** an admin marks a ContentLink as not relevant
- **THEN** the is_rejected field SHALL be set to True
- **THEN** the rejected link SHALL not appear in content recommendations

### Requirement: Content Link Display Sections
The system SHALL display related content in dedicated sections on each content detail page. Sections SHALL be grouped by target content type (e.g., "Passende Spiele", "Passende Rezepte", "Passende Wissensbeiträge"). Each section SHALL show a maximum of 6 related items as cards.

#### Scenario: Viewing related content on a GroupSession page
- **WHEN** a user views a GroupSession detail page
- **THEN** the page SHALL display sections for related Games, Recipes, and Blogs
- **THEN** each section SHALL show only non-rejected ContentLinks sorted by relevance_score descending

#### Scenario: No related content found
- **WHEN** no ContentLinks exist for a content item
- **THEN** the related content sections SHALL be hidden (not shown as empty)

### Requirement: Content Link CRUD API
The system SHALL provide API endpoints for managing ContentLinks: listing links for a content item, creating manual links, and rejecting links (admin only).

#### Scenario: Listing links for content
- **WHEN** GET `/api/content-links/?source_type=session&source_id=1`
- **THEN** the system SHALL return all non-rejected ContentLinks for that source, grouped by target type

#### Scenario: Creating a manual link
- **WHEN** POST `/api/content-links/` with source and target identifiers
- **THEN** a ContentLink SHALL be created with link_type='manual'
- **THEN** duplicate links (same source+target) SHALL be prevented

#### Scenario: Rejecting a link (admin)
- **WHEN** PATCH `/api/content-links/{id}/reject/` by an admin
- **THEN** the ContentLink's is_rejected SHALL be set to True

### Requirement: EmbeddingFeedback Model
The system SHALL provide an `EmbeddingFeedback` model for tracking quality issues with embedding-based recommendations. Fields: content_link (FK to ContentLink), feedback_type (TextChoices: not_relevant/wrong_category/offensive), notes (TextField), created_by (FK to User), created_at (DateTimeField).

#### Scenario: Admin submits embedding feedback
- **WHEN** an admin marks an embedding-based recommendation as "not relevant"
- **THEN** an EmbeddingFeedback record SHALL be created
- **THEN** the associated ContentLink SHALL be marked as is_rejected=True

#### Scenario: Viewing feedback in admin
- **WHEN** an admin views the EmbeddingFeedback admin page
- **THEN** all feedback entries SHALL be listed with the source and target content titles
