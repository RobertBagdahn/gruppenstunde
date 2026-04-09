## ADDED Requirements

### Requirement: Abstract Content Base Class
The system SHALL provide an abstract Django model `Content` that serves as the base class for all content types (GroupSession, Blog, Game, Recipe). The abstract model SHALL include the following shared fields: title (CharField, max 255), slug (SlugField, unique per table), summary (TextField), description (TextField, Markdown), difficulty (TextChoices), costs_rating (TextChoices), execution_time (TextChoices), preparation_time (TextChoices), status (TextChoices: draft/submitted/approved/rejected/archived), image (ImageField), embedding (VectorField 768-dim, nullable), view_count (IntegerField), like_score (IntegerField), created_at (DateTimeField), updated_at (DateTimeField), deleted_at (DateTimeField, nullable), authors (M2M to User), tags (M2M to Tag), scout_levels (M2M to ScoutLevel).

#### Scenario: New content type inherits all base fields
- **WHEN** a developer creates a new concrete model inheriting from `Content`
- **THEN** the model SHALL automatically have all shared fields without additional code

#### Scenario: Each content type has its own database table
- **WHEN** migrations are generated for a Content subclass
- **THEN** a separate table SHALL be created with all Content fields plus type-specific fields

### Requirement: Soft Delete for all Content
The system SHALL implement soft delete via a `deleted_at` DateTimeField (nullable) on the abstract `Content` model. A custom manager `objects` SHALL filter out soft-deleted records automatically. A secondary manager `all_objects` SHALL return all records including soft-deleted ones.

#### Scenario: Soft deleting content
- **WHEN** a user or admin soft-deletes a content item
- **THEN** the `deleted_at` field SHALL be set to the current UTC timestamp
- **THEN** the item SHALL no longer appear in default queries via `objects` manager
- **THEN** the item SHALL still be accessible via `all_objects` manager

#### Scenario: Restoring soft-deleted content
- **WHEN** an admin restores a soft-deleted content item
- **THEN** the `deleted_at` field SHALL be set to null
- **THEN** the item SHALL appear in default queries again

### Requirement: Content Type Registry
The system SHALL maintain a registry of all concrete Content types that enables dynamic discovery of content types for search, linking, and admin purposes.

#### Scenario: Discovering all content types
- **WHEN** the search service needs to query all content types
- **THEN** the registry SHALL return all registered concrete Content model classes

#### Scenario: Resolving content type from string
- **WHEN** a content type identifier string (e.g., 'session', 'recipe') is provided
- **THEN** the registry SHALL return the corresponding model class

### Requirement: Author tracking
The system SHALL track one or more authors per content item via a M2M relationship to User. The primary author (first author) SHALL be the creator. Admins SHALL be able to add or change authors.

#### Scenario: Content creation stores author
- **WHEN** an authenticated user creates a content item
- **THEN** the user SHALL be automatically added as the first author

#### Scenario: Admin changes author
- **WHEN** an admin updates the authors of a content item
- **THEN** the authors M2M relationship SHALL be updated accordingly

### Requirement: Slug auto-generation
The system SHALL auto-generate a URL-safe slug from the title using `django.utils.text.slugify`. If a slug collision occurs, a numeric suffix SHALL be appended.

#### Scenario: Slug generated from title
- **WHEN** a content item is created with title "Nachtwanderung im Wald"
- **THEN** the slug SHALL be "nachtwanderung-im-wald"

#### Scenario: Slug collision resolution
- **WHEN** a content item is created with a title that produces an already-existing slug
- **THEN** the system SHALL append a numeric suffix (e.g., "nachtwanderung-im-wald-2")

### Requirement: Pydantic Base Schema
The system SHALL provide base Pydantic schemas (`ContentBaseOut`, `ContentCreateIn`, `ContentUpdateIn`) that all content-type-specific schemas extend. The base output schema SHALL include all shared fields plus computed fields (author_names, tag_names, content_type).

#### Scenario: Content type API response
- **WHEN** any content item is returned via API
- **THEN** the response SHALL include all `ContentBaseOut` fields plus type-specific fields
- **THEN** the response SHALL include a `content_type` discriminator field (e.g., "session", "recipe", "blog", "game")

### Requirement: Zod Base Schema
The system SHALL provide a base Zod schema (`ContentBaseSchema`) in the frontend that all content-type-specific Zod schemas extend. The base schema SHALL match the Pydantic `ContentBaseOut` schema 1:1.

#### Scenario: Frontend type safety
- **WHEN** a content API response is parsed
- **THEN** the Zod schema SHALL validate all base fields
- **THEN** TypeScript types SHALL be inferred from the Zod schema
