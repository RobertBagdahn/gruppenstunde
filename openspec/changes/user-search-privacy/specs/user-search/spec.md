## MODIFIED Requirements

### Requirement: Generic user search endpoint
The system SHALL provide a generic, paginated user search endpoint at `/api/users/search/` for collaborator invite flows across all apps. Results SHALL contain only `id` and `display_name`. `display_name` SHALL be the profile scout name, the profile name or the account name and otherwise „Inspi-Nutzer #<id>“; it SHALL NOT contain an e-mail address or username. The query `q` SHALL be required with at least 2 characters after trimming. Queries without `@` SHALL match name fields only (account first/last name, profile scout/first/last name). Queries containing `@` SHALL be a case-insensitive exact e-mail lookup returning at most one user. Inactive users SHALL NOT be returned. `GET /api/shopping-lists/users/` SHALL behave identically.

#### Scenario: Search users by name
- **WHEN** an authenticated user requests `GET /api/users/search/?q=robert&page=1&page_size=20`
- **THEN** the system returns a paginated response with active users whose name fields contain "robert", with fields `id` and `display_name` only

#### Scenario: Invite by known e-mail address
- **WHEN** an authenticated user requests `GET /api/users/search/?q=Max@Example.org`
- **THEN** the system returns at most the one user whose e-mail equals `max@example.org` case-insensitively
- **AND** the response does not contain the e-mail address

#### Scenario: Partial e-mail does not match
- **WHEN** an authenticated user searches for `max@example`
- **THEN** the system returns no users

#### Scenario: Missing or short query is rejected
- **WHEN** an authenticated user requests `GET /api/users/search/` without `q` or with fewer than 2 characters
- **THEN** the system returns HTTP 422 and lists no users

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated user requests `GET /api/users/search/`
- **THEN** the system returns HTTP 401

#### Scenario: Page size is limited
- **WHEN** an authenticated user requests `GET /api/users/search/?q=robert&page_size=21`
- **THEN** the system returns HTTP 422

### Requirement: Response format follows pagination convention
The system SHALL return user search results in the standard paginated format used across all list endpoints.

#### Scenario: Paginated response structure
- **WHEN** an authenticated user requests `GET /api/users/search/?q=paula&page=2&page_size=20`
- **THEN** the response contains `{ items, total, page, page_size, total_pages }` with `page=2` and `page_size=20`
