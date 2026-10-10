## 1. Bound and validate runtime capacity

- [ ] 1.1 Review Terraform and Cloud Build configuration for one documented source of truth for Cloud Run instance/concurrency, Gunicorn, background-worker, and Django connection settings.
- [ ] 1.2 Test capacity calculation boundaries and PostgreSQL command behavior; make clear that it is a preflight check, not proof of production capacity.
- [ ] 1.3 Compare proposed settings with a documented non-production or reviewed database budget before rollout.

## 2. Bound ingredient-statistics processing

- [ ] 2.1 Refactor distribution processing to avoid repeated full-dataset materialization while preserving response behavior.
- [ ] 2.2 Add parity tests for empty, single-value, duplicate, and outlier data.
- [ ] 2.3 Benchmark representative concurrent workload before making performance or resource claims.

## 3. Make recipe alternatives atomic and safe

- [ ] 3.1 Add a typed API operation that creates/reuses an exchange group and adds an alternative in one transaction.
- [ ] 3.2 Test recipe edit permissions, Ingredient visibility, active Portion validation, idempotency, and rollback behavior.
- [ ] 3.3 Keep Pydantic and Zod contracts synchronized and use the atomic operation from the Food editor.
- [ ] 3.4 Preserve the user's pending alternative when a save fails so retry does not require re-entering the selection.
- [ ] 3.5 Make embedding generation safe for legacy/direct-gram items without a Portion.

## 4. Improve safe API and Buffet error recovery

- [ ] 4.1 Return a safe, stable server-error response with a request correlation ID and keep exception details in server logs only.
- [ ] 4.2 Test backend error serialization and correlation IDs.
- [ ] 4.3 Preserve HTTP status, error code, and request ID in the Food API client, including empty/non-JSON responses.
- [ ] 4.4 Show German error messages and explicit read/preview retry controls without automatically replaying mutations.
- [ ] 4.5 Keep Buffet selections and role values after failed save; close only after success.

## 5. Require release checks

- [ ] 5.1 Add backend, main-frontend TypeScript, and Food frontend checks to release verification. Keep full main-frontend ESLint cleanup separate from this change.
- [ ] 5.2 Add deterministic mocked browser coverage for Buffet persistence/recovery, recipe-alternative persistence/retry, and safe server-error feedback.
- [ ] 5.3 Make required checks block image build/deployment and validate Cloud Build configuration syntax.
- [ ] 5.4 Run relevant local checks and report results accurately. No production inspection, data repair, migration, or deployment is included in this change.
