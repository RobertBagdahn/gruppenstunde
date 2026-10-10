## Context

This change consolidates Food API reliability, recipe-alternative integrity, buffet recovery, database-capacity controls, and release checks. The implementation is based on repository code and tests; it does not assert that any production inspection, repair, deployment, migration, or load test has occurred.

Current application behavior allows Food clients to lose useful HTTP error details, recipe alternatives to be created through multiple requests, and deployment checks to omit critical Food workflows. The release work should make failures safe and actionable, keep alternative creation atomic, and put focused checks before deployment.

## Goals / Non-Goals

**Goals:**
- Bound the configured Cloud Run/Gunicorn database-connection envelope and provide an explicit capacity check.
- Reduce repeated full-dataset materialization in ingredient-statistics endpoints while preserving response behavior.
- Create recipe alternatives atomically, deriving the ingredient from an active portion and checking existing recipe/ingredient access rules.
- Return safe server-error details and a correlation ID, and expose actionable Food UI errors without losing user input.
- Make buffet loading, preview, and save failures retryable without discarding selections.
- Run backend, frontend, Food frontend, and deterministic Food E2E checks before release builds/deployment.

**Non-Goals:**
- Do not broaden access to private or unreadable draft ingredients.
- Do not expose tracebacks, SQL details, or request bodies in API responses.
- Do not automatically replay an ambiguous failed mutation.
- Do not mass-edit production data, run migrations, deploy, or invoke AI as part of this change.
- Do not claim that production capacity, IAM, backup, migration, or dataset checks have been verified.

## Decisions

### 1. Declare and check a connection envelope

Use maintained configuration for Cloud Run instance/concurrency limits, Gunicorn workers/threads, background workers, and Django connection lifetime. Add a pure capacity calculator and a PostgreSQL management command that compares the configured maximum with database capacity while reserving connections for operational use. Initial defaults in code/configuration are conservative estimates, not production measurements or approval to deploy. Validate these values against the actual database settings and representative load before rollout. Do not rely on the capacity command alone as an alerting system.

### 2. Bound ingredient-statistics work

Avoid repeated full-dataset materialization in ingredient-distribution requests. Preserve response contracts, and use parity tests for representative empty, single-value, duplicate, and outlier data. Any performance or concurrency claim requires a reproducible benchmark; this change does not claim a production load test.

### 3. Create exchange alternatives transactionally

Add a typed operation for adding an alternative to an existing recipe item. The API derives its Ingredient from an active, valid Portion, checks recipe edit permission and Ingredient visibility using existing access helpers, and creates/reuses the exchange group, positions, and alternative within a database transaction. The frontend keeps the pending alternative locally and submits it through that operation when saving, so a failed request can be retried with its stable request ID. Draft status alone must not widen or override visibility permissions. Keep direct-gram recipe items valid outside the alternative operation, and make embedding generation tolerate legacy items without a Portion.

### 4. Return safe, correlated API errors

For server errors, return a stable code, safe German message, and request ID. Log exception details on the server with the same ID. Expose the request ID through the API response header for cross-origin Food clients. Preserve HTTP status and structured errors in the shared Food API error type, including empty or non-JSON responses. Reads may offer explicit retries; mutations must not be replayed automatically. Keep the user's in-progress edits available after failure.

### 5. Recover the Buffet flow and gate releases

Keep Buffet selections, template, role amounts, and manual-item policy after failed saves; close the builder only after success. Provide retry controls for failed catalog, state, search, and preview requests. Add deterministic mocked browser coverage for the user-visible Buffet workflow, alternative persistence/retry, and safe 500 handling.

Run backend quality/tests, main-frontend checks, Food lint/type/unit/build checks, and the mocked Food browser tests before the deploy pipeline proceeds to image builds. No production deploy, migration, or service-account permission change is part of this implementation task.

## Risks / Trade-offs

- [Capacity defaults may not fit the deployed database or traffic] → Treat them as proposed bounds; verify database capacity and load-test before rollout.
- [Focused lint/type scripts can miss unrelated issues] → Keep full test/type/build checks where available and document the intentionally scoped lint/type checks.
- [Atomic alternative creation changes the Food mutation path] → Keep the existing exchange endpoints for other callers and test authorization, validation, idempotency, rollback, and response schemas.
- [Draft ingredients have different visibility policies] → Reuse existing server-side access helpers; never infer visibility from draft status in the client.
- [Adding required checks can lengthen builds] → Run independent checks in parallel and keep browser tests deterministic and service-independent.
- [Deployment configuration is part of Terraform and Cloud Build] → Review the rendered plan and active trigger substitutions before applying or deploying; this MR does not authorize a production rollout.

## Migration / Rollout Plan

1. Run repository tests and configuration validation; review resulting capacity defaults and Terraform plan.
2. Validate connection limits and access behavior in a non-production environment before production rollout.
3. Deploy backend API additions and error contract before the Food client that consumes the atomic alternative API.
4. Enable release gates and verify the mocked browser suite in CI.
5. Do not run data repair, migrations, AI jobs, or production deployment without a separately reviewed and explicitly approved operation.

## Open Questions

- What measured Cloud SQL connection budget and request latency target should define final production instance/concurrency defaults?
- Which deployment identity and trigger substitutions will be used, and are its required permissions least-privilege?
- Which full-repository lint/type baselines should be addressed separately from this focused release work?
