## MODIFIED Requirements

### Requirement: Abstract Content Base Class
The system SHALL provide an abstract Django model `Content` that serves as the base class for all content types (GroupSession, Blog, Game, Recipe). The abstract model SHALL include the following shared fields: title (CharField, max 255), slug (SlugField, unique per table), summary (TextField), description (TextField, Markdown), difficulty (TextChoices), costs_rating (TextChoices), execution_time (TextChoices), preparation_time (TextChoices), status (TextChoices: draft/submitted/approved/rejected/archived), image (ImageField), embedding (VectorField 768-dim, nullable), view_count (IntegerField), like_score (IntegerField), created_at (DateTimeField), updated_at (DateTimeField), deleted_at (DateTimeField, nullable), authors (M2M to User), tags (M2M to Tag), scout_levels (M2M to ScoutLevel).

All concrete Content types SHALL support image management operations (upload, delete, set-from-URL) through their respective API routers. The permission check for image management SHALL follow the same pattern: the user MUST be authenticated AND be either staff or an author of the content.

#### Scenario: New content type inherits all base fields
- **WHEN** a developer creates a new concrete model inheriting from `Content`
- **THEN** the model SHALL automatically have all shared fields without additional code

#### Scenario: Each content type has its own database table
- **WHEN** migrations are generated for a Content subclass
- **THEN** a separate table SHALL be created with all Content fields plus type-specific fields

#### Scenario: Image management permission check
- **WHEN** a user attempts to upload, delete, or set an image on any content type
- **THEN** the system SHALL verify the user is authenticated AND is either staff or an author of the content item
- **THEN** if the check fails, the system SHALL return HTTP 403 with "Keine Berechtigung."
