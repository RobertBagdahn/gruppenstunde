## 1. Bound and validate runtime capacity

- [x] 1.1 Review Terraform and Cloud Build configuration for a consistent, documented envelope covering Cloud Run instance/concurrency, Gunicorn, background-worker, and Django connection settings. (Since WP-08 the GitHub Actions deploy workflow is the single pipeline; consistency enforced by `core/tests/test_runtime_limits.py`.)
- [x] 1.2 Test capacity calculation boundaries and PostgreSQL command behavior; clarify that the command is a preflight check, not proof of production capacity.
- [x] 1.3 Capacity budget: request handlers hold one session each and the data-offensive endpoints run inline (`backfill_embeddings(workers=1)`, tests `test_request_path_db_connections.py` and `test_data_offensive_api.py`), so the thread counts of the review no longer apply. A comparison with the real Cloud SQL budget still needs production access (`check_database_capacity` stays a preflight check).

## 2. Bound ingredient-statistics processing

- [x] 2.1 Refactor distribution processing to avoid repeated full-dataset materialization while preserving response behavior.
- [x] 2.2 Add parity tests for empty, single-value, duplicate, and outlier data (`test_ingredient_statistics.py`: without values, single value, only duplicates, duplicate pairs, outlier, outlier flags, minimum sample size).
- [ ] 2.3 Benchmark representative concurrent workload before making performance or resource claims.

## 3. Make recipe alternatives atomic and safe

- [x] 3.1 Add a typed API operation that creates/reuses an exchange group and adds an alternative in one transaction.
- [x] 3.2 Test recipe edit permissions, Ingredient visibility, active Portion validation, idempotency, and rollback behavior (`test_exchanges_and_variants.py::TestAtomicExchangeAlternative`, incl. 403 and inactive Portion).
- [x] 3.3 Keep Pydantic and Zod contracts synchronized and use the atomic operation from the Food editor.
- [x] 3.4 Preserve the user's pending alternative when a save fails so retry does not require re-entering the selection.
- [x] 3.5 Make embedding generation safe for legacy/direct-gram items without a Portion.

## 4. Improve safe API and Buffet error recovery

- [x] 4.1 Return a safe, stable server-error response with a request correlation ID and keep exception details in server logs only.
- [x] 4.2 Test backend error serialization and correlation IDs.
- [x] 4.3 Preserve HTTP status, error code, and request ID in the Food API client, including empty/non-JSON responses.
- [x] 4.4 Show German error messages and explicit read/preview retry controls without automatically replaying mutations.
- [x] 4.6 Buffet preview error shows the HTTP status ("Serverfehler (HTTP 500) …", spec `buffet-builder`) and has a mocked test for a preview 500 (`BuffetBuilder.test.tsx`).
- [x] 4.5 Keep Buffet selections and role values after failed save; close only after success.

## 5. Require release checks

- [x] 5.1 Add backend, main-frontend TypeScript, and Food frontend checks to release verification. Keep full main-frontend ESLint cleanup separate from this change.
- [x] 5.2 Add deterministic mocked browser coverage for Buffet persistence/recovery, recipe-alternative persistence/retry, and safe server-error feedback.
- [x] 5.3 Make required checks block image build/deployment and validate Cloud Build configuration syntax. (WP-08: GitHub Actions `deploy` job `needs` backend, frontend and Food checks incl. full Food ESLint and mocked E2E; Cloud Build removed.)
- [x] 5.4 Run relevant local checks and report results accurately. No production inspection, data repair, migration, or deployment is included in this change.
