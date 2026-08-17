## ADDED Requirements

### Requirement: Content API Router Factory
The system SHALL provide a generic router factory `create_content_api_router()` in `content/base_api.py` that generates shared CRUD routes (autocomplete, by-slug, comments, materials) for Content-type subclasses, parameterized by model and schema classes.

#### Scenario: Factory generates autocomplete route
- **WHEN** a Content-type app calls `create_content_api_router(Session, SessionListOut, SessionDetailOut, prefix="/sessions")`
- **THEN** the returned router SHALL include a GET `/autocomplete/` endpoint that queries the model by title/text search

#### Scenario: Factory generates by-slug route
- **WHEN** the factory is invoked with a Content-type model
- **THEN** the returned router SHALL include a GET `/{slug}/` endpoint that resolves the Content instance by slug

#### Scenario: Factory accepts extra routes callback
- **WHEN** a Content-type app needs type-specific routes beyond the shared CRUD
- **THEN** the factory SHALL accept an optional `extra_routes` callable parameter that receives the router and adds custom endpoints

### Requirement: Session, Blog, Game apps use the factory
The `session/api.py`, `blog/api.py`, and `game/api.py` modules SHALL delegate shared CRUD route registration to `create_content_api_router()` and retain only type-specific endpoints.

#### Scenario: Session API uses factory
- **WHEN** session API routes are registered
- **THEN** autocomplete, by-slug, comments, and materials routes SHALL be provided by the factory, NOT duplicated inline
