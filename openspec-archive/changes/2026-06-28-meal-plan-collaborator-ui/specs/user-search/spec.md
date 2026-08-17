## ADDED Requirements

### Requirement: Generic user search endpoint
The system SHALL provide a generic, paginated user search endpoint at `/api/users/search/` for collaborator invite flows across all apps.

#### Scenario: Search users by username
- **WHEN** an authenticated user requests `GET /api/users/search/?q=robert&page=1&page_size=20`
- **THEN** the system returns a paginated response with users whose username contains "robert", with fields `id` and `username`

#### Scenario: Empty search returns all users
- **WHEN** an authenticated user requests `GET /api/users/search/` without a `q` parameter
- **THEN** the system returns a paginated list of all users, ordered by username

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated user requests `GET /api/users/search/`
- **THEN** the system returns 403 Forbidden

#### Scenario: Page size is limited
- **WHEN** an authenticated user requests `GET /api/users/search/?page_size=100`
- **THEN** the system caps page_size at 50 and returns the first 50 results

### Requirement: Response format follows pagination convention
The system SHALL return user search results in the standard paginated format used across all list endpoints.

#### Scenario: Paginated response structure
- **WHEN** an authenticated user requests `GET /api/users/search/?page=2&page_size=20`
- **THEN** the response contains `{ items, total, page, page_size, total_pages }` with `page=2` and `page_size=20`
