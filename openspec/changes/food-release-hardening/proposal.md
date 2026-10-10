# Food Release Hardening

## Why

Food workflows need reliable error handling and release coverage. Recipe alternatives should be persisted as one validated operation rather than several requests that can leave a partially updated exchange group. Buffet and recipe-editing failures should be visible and recoverable without losing user input. Release checks should exercise the Food frontend and its critical user journeys before deployment.

## What Changes

- Add a conservative database-connection capacity calculator and management check, align configurable Cloud Run/Gunicorn limits, and reduce repeated dataset materialization in ingredient statistics.
- Add an atomic, typed recipe-alternative operation with server-side permissions, active portion validation, idempotency, and frontend Pydantic/Zod contract parity.
- Make recipe embedding generation tolerate portionless legacy/direct-gram items.
- Preserve safe HTTP status/code/request-reference information in Food API errors and show German, actionable failure feedback.
- Preserve Buffet selections on failure and provide explicit retries for relevant read/preview operations.
- Add backend/frontend/E2E release checks that run before image build/deployment.

## Capabilities

### New Capabilities

- `food-runtime-capacity`: Configure and check backend database connection capacity.

### Modified Capabilities

- `food-api-contracts`: Preserve structured error information and present safe server-error feedback.
- `buffet-builder`: Keep the workflow observable and recoverable on request failures.
- `recipe-exchanges`: Create alternatives atomically while respecting ingredient visibility.
- `recipe-creation-roundtrip-integrity`: Keep embedding generation safe for supported portionless items.
- `food-e2e-regression-suite`: Cover the affected Food workflows with deterministic browser tests.
- `food-release-integrity`: Require Food quality checks and critical regressions before release.

## Impact

- Backend API, core error handling/correlation IDs, capacity configuration/checks, ingredient statistics, recipe alternative validation, and related tests.
- Food frontend API schemas/hooks, recipe editor, ingredient searches, Buffet error handling, and related tests.
- Terraform and Cloud Build release configuration; deterministic Playwright coverage.

This change does not perform or claim production inspection, data repair, migration, deployment, load testing, backup verification, or IAM verification. Those require separate review and authorization.
