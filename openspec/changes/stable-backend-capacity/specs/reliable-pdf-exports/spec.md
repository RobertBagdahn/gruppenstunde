## MODIFIED Requirements

### Requirement: Bounded PDF rendering resources
The backend SHALL render PDFs without allowing concurrent rendering to exhaust a Cloud Run instance. The production container SHALL have at least 1 GiB of memory. All WeasyPrint renders SHALL pass through the shared rendering helper, which MUST allow at most one PDF render per process at a time; further PDF requests on the same instance SHALL wait for the running render. Non-PDF requests SHALL continue to be served concurrently up to the configured request concurrency. The deploy pipeline, `Dockerfile.backend`, the Makefile and Terraform defaults MUST use the same concurrency, worker and thread values.

#### Scenario: PDF export under production limits
- **WHEN** an authenticated user requests any backend PDF export
- **THEN** the request SHALL be processed within the configured Cloud Run memory limit
- **THEN** no second PDF render SHALL execute concurrently in the same process
- **THEN** Cloud Run SHALL remain able to scale additional instances for parallel requests

#### Scenario: Concurrent PDF and API requests
- **GIVEN** a PDF render is running on an instance
- **WHEN** another user requests a shopping list on the same instance
- **THEN** the shopping list request SHALL be served without waiting for the PDF render

#### Scenario: Unauthenticated PDF request
- **WHEN** an unauthenticated user requests a PDF export that requires login
- **THEN** the API SHALL reject the request before acquiring the render slot

#### Scenario: Runtime limits stay consistent
- **WHEN** the backend runtime limits are changed in one deploy source
- **THEN** a backend test SHALL fail until `Dockerfile.backend`, the deploy workflow, the Makefile and the Terraform defaults use the same concurrency, worker and thread values
