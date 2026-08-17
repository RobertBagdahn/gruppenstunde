## MODIFIED Requirements

### Requirement: Generic ContentView Model
The system SHALL provide a single `ContentView` model for bot-free view tracking. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), session_key (CharField), ip_hash (CharField, SHA256), user_agent (CharField), user (FK to User, nullable), created_at.

#### Scenario: Recording a view
- **WHEN** a user views a content detail page
- **THEN** the system SHALL check the User-Agent against known bot patterns (bot, crawl, spider, slurp, headless, selenium, puppeteer, playwright, curl, wget, python-requests, httpx, aiohttp, scrapy)
- **THEN** if the User-Agent matches a bot pattern or is empty, the view SHALL NOT be recorded
- **THEN** if the user is not a bot and no ContentView exists for the same session_key within 24 hours, a ContentView record SHALL be created
- **THEN** the content object's `view_count` field SHALL be atomically incremented using a database-level `F()` expression

#### Scenario: Recording a view for Recipe content
- **WHEN** a user views a Recipe detail page via `GET /api/recipes/{id}/` or `GET /api/recipes/by-slug/{slug}/`
- **THEN** the system SHALL record the view using the same `record_view` mechanism as GroupSession, Blog, and Game

#### Scenario: Duplicate view within 24 hours
- **WHEN** a ContentView already exists for the same content object and session_key within the last 24 hours
- **THEN** no new ContentView SHALL be created
- **THEN** the `view_count` SHALL NOT be incremented
