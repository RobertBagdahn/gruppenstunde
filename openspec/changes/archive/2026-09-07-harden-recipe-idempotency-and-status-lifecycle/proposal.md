## Why

Recipe item creation is protected against duplicate submissions in the current wizard flow, but the backend still relies partly on mutable payload fields rather than a durable request identity. Retries, timeouts, or other API clients can therefore create a second logical item or replay a completed mutation. The recipe status lifecycle also exists across backend and frontend code but lacks a focused regression contract for private, group, public, submitted, and approved transitions.

## What Changes

- Add scoped backend idempotency for recipe-item mutations using an explicit request identity and an atomic replay-safe persistence path.
- Preserve legitimate identical ingredients when they have different request identities.
- Define and test replay behavior after successful requests, failed requests, and deleted items.
- Add integration coverage for recipe visibility and status transitions from draft through submitted and approved.
- Verify that wizard completion submits public recipes for moderation while private and group recipes remain drafts.
- Clean up Ruff findings in the directly affected production files only; do not reformat the entire Recipe app.
- Keep the Wizard and standalone URL-import UI flows separate while preserving their shared API contracts.
- Keep the existing Pydantic/Zod recipe contracts synchronized.

## Capabilities

### New Capabilities

- `recipe-item-idempotency`: Request-identity-based replay protection for recipe-item mutations.

### Modified Capabilities

- `recipe-draft-workflow`: Specify and test the draft, submitted, and approved status lifecycle for recipe visibility choices.
- `recipe-creation-wizard`: Specify the completion behavior for private, group, and public recipes.

## Impact

- Backend: `recipe` item API/model/schema code, recipe visibility/status API, and related transaction tests.
- Frontend Food: recipe completion behavior and any request payload types needed for idempotency keys.
- Tests: backend recipe integration tests, deterministic Food frontend tests, and Playwright status-lifecycle coverage.
- Tooling: targeted Ruff cleanup for touched production files.
- Database: likely an additive idempotency/request-record migration; the design must confirm whether a model or a constrained field is required.
- No Sentry dependency or telemetry integration is included.
