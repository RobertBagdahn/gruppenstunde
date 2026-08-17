## MODIFIED Requirements

### Requirement: Unauthenticated requests return 403
All API endpoints that require authentication SHALL respond with HTTP 403 (Forbidden) with message "Anmeldung erforderlich" when the request is unauthenticated. HTTP 401 SHALL NOT be used for unauthenticated requests.

#### Scenario: Unauthenticated access to protected endpoint
- **WHEN** an unauthenticated client accesses any endpoint that requires authentication
- **THEN** the response status SHALL be 403 with body `{"detail": "Anmeldung erforderlich"}`

#### Scenario: Authenticated access remains unchanged
- **WHEN** an authenticated client accesses a protected endpoint
- **THEN** the response SHALL be processed normally with appropriate 200/201/204 status
