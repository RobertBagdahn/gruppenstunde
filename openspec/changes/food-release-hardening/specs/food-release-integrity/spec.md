## ADDED Requirements

### Requirement: Food release gates include the Food frontend and critical regression flows
The pull-request verification workflow SHALL run Food-frontend lint, type-check, unit tests, and production build. It SHALL run the deterministic critical Food E2E tests for Buffet persistence and recipe alternatives before a release is eligible for deployment. A failure in any required Food check MUST fail the release gate.

#### Scenario: Food frontend regression is introduced
- **WHEN** a pull request introduces a failing Food type, lint, unit, build, or required E2E check
- **THEN** the verification workflow SHALL fail
- **THEN** the deployment workflow MUST NOT treat the change as release-ready

#### Scenario: Food workflow returns an unexpected server error
- **WHEN** a required Buffet or recipe-alternative E2E flow receives an unexpected HTTP 5xx response
- **THEN** the relevant test and pull-request check SHALL fail with the failing endpoint and status available in test output
