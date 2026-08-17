## MODIFIED Requirements

### Requirement: Generic ContentComment Model
The system SHALL provide a single `ContentComment` model that works with all content types via Django ContentType framework. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), parent (FK to self, nullable for nesting), text (TextField), author_name (CharField for anonymous), user (FK to User, nullable), status (TextChoices: pending/approved/rejected), created_at, updated_at.

#### Scenario: Adding a comment to any content type
- **WHEN** POST `/api/content/{type}/{id}/comments/` with comment text
- **THEN** a ContentComment SHALL be created linked to the specified content item
- **THEN** anonymous comments SHALL have status='pending' (moderation required)
- **THEN** authenticated user comments SHALL have status='approved'

#### Scenario: Listing comments for content
- **WHEN** GET `/api/content/{type}/{id}/comments/`
- **THEN** only approved comments SHALL be returned
- **THEN** comments SHALL be nested by parent_id

### Requirement: Generic ContentEmotion Model
The system SHALL provide a single `ContentEmotion` model for reactions across all content types. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), emotion_type (TextChoices: in_love/happy/disappointed/complex), user (FK to User, nullable), session_key (CharField for anonymous), created_at.

#### Scenario: Adding an emotion to any content type
- **WHEN** POST `/api/content/{type}/{id}/emotions/` with emotion_type
- **THEN** a ContentEmotion SHALL be created or toggled (remove if same emotion exists)
- **THEN** the content's like_score SHALL be recalculated

#### Scenario: Emotion counts on content
- **WHEN** content is retrieved via API
- **THEN** emotion counts SHALL be included (in_love_count, happy_count, disappointed_count, complex_count)

### Requirement: Generic ContentView Model
The system SHALL provide a single `ContentView` model for bot-free view tracking. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), session_key (CharField), ip_hash (CharField, SHA256), user_agent (CharField), user (FK to User, nullable), created_at.

#### Scenario: Recording a view
- **WHEN** a user views a content detail page
- **THEN** a ContentView SHALL be recorded if not a bot and not a duplicate (same session within 24h)
- **THEN** the content's view_count SHALL be incremented

## REMOVED Requirements

### Requirement: Comment Model (idea app)
**Reason**: Replaced by generic ContentComment
**Migration**: Existing data migrated to ContentComment

### Requirement: Emotion Model (idea app)
**Reason**: Replaced by generic ContentEmotion
**Migration**: Existing data migrated to ContentEmotion

### Requirement: RecipeComment Model
**Reason**: Replaced by generic ContentComment
**Migration**: Existing data migrated to ContentComment

### Requirement: RecipeEmotion Model
**Reason**: Replaced by generic ContentEmotion
**Migration**: Existing data migrated to ContentEmotion
