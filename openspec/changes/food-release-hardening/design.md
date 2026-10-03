## Context

Cloud Logging for the user-reported production window on 2026-10-02 shows the buffet UI page and meal-plan requests, but no Buffet API requests that day. At 09:34 UTC, `POST /api/recipes/523/exchanges/` returned 201 and the immediately following `PATCH /api/recipes/523/recipe-items/3804/` returned 500. The traceback is a Cloud SQL connection-slot exhaustion while Django resolves the authenticated session. Later requests also failed under the same condition. The deployed backend used a `db-f1-micro`, Cloud Run max scale 10 and concurrency 10, Gunicorn 2 workers × 4 threads, and Django `CONN_MAX_AGE=60`. At 09:35 UTC, Cloud Run recorded 519 MiB used against a 512 MiB limit during ingredient-distribution requests.

Subsequent recipe updates produced background embedding exceptions at `item.portion.ingredient` because a RecipeItem had no portion. The recipe API currently accepts `portion_id: null`; its response schema falls back to the label “Zutat”. This explains the data-integrity symptom, although request logs do not record payloads and cannot attribute a particular malformed row to a specific save.

## Goals / Non-Goals

**Goals:**
- Prevent configured Cloud Run request and background concurrency from exceeding a measured Cloud SQL connection budget, with headroom for operators and migrations.
- Keep ingredient distribution requests within a bounded memory budget.
- Make the buffet workflow observable, persistent, and recoverable.
- Support readable draft ingredients as alternatives without changing their status, while preserving all existing access controls.
- Make alternative creation a single validated transaction so partial exchange groups and nameless alternatives cannot be persisted.
- Preserve HTTP error status and safe correlation information in the Food UI.
- Add deterministic release checks for the affected Food frontend and user workflows.

**Non-Goals:**
- Do not make private or otherwise unreadable draft ingredients visible to other users.
- Do not expose stack traces, SQL errors, or user request bodies in UI messages or logs.
- Do not automatically replay a mutation after an ambiguous 5xx.
- Do not mass-edit existing recipe data or add a global `RecipeItem.portion_id NOT NULL` constraint; null portions may be valid for direct-gram entries.
- Do not increase Cloud SQL spend or select a new database tier without measuring the actual connection limit and testing the resulting capacity plan.

## Decisions

### 1. Declare and enforce a single database-connection budget

Calculate the maximum simultaneous application connections from Cloud Run maximum instances, per-instance request concurrency, Gunicorn workers/threads, background executor workers per process, and Django connection lifetime. Read the deployed Cloud SQL `max_connections` value during implementation; reserve capacity for migrations, operational access, and health checks. Set the Cloud Run scaling/concurrency and Django connection lifecycle so the calculated application maximum remains below that budget. Ensure the settings are declared in one maintained deployment source: Terraform must manage the relevant scaling controls instead of broadly ignoring every Cloud Run template change, or the deployment pipeline must explicitly own those controls. Add an automated budget check and runtime metrics/alerts for saturation.

Prefer short-lived Django request connections and a conservative initial envelope: two maximum backend instances, two concurrent requests per instance, two Gunicorn workers, four worker threads, and one background worker per process. With `CONN_MAX_AGE=0`, the calculated application maximum is eight sessions; reserve eight additional database connections for other services and operations. A read-only production check after authorization found `max_connections=25`, three superuser-reserved connections, and an operator reserve of eight, leaving an application budget of 14. The currently deployed 10-instance × concurrency-10 envelope with two workers, four threads, and one background worker per process can reach 100 sessions and fails this budget; the proposed 2-instance × concurrency-2 envelope calculates to eight and passes the numerical check. This is not rollout approval: it must be load-tested and reviewed alongside the report-only exchange-data findings. Add a proxy/pooler only if measurements show that short-lived connections cannot meet latency needs; transaction pooling adds compatibility and operational complexity and is not justified by the incident alone.

### 2. Bound ingredient-statistics work

Avoid building multiple full copies of all verified ingredient rows per distribution request. Use database-side numeric aggregation/percentiles and histogram grouping where practical; when names are needed for outliers, fetch only the necessary columns and use bounded iteration. Preserve existing response contracts. Add tests for result parity and bounded query/resource behavior, plus a concurrent-load test against a representative dataset. AI-interaction daily boundaries use Django's `timezone.localdate()` so date filters, aggregation and the displayed timeline day agree across server timezones.

### 3. Create exchange alternatives through one backend transaction

Replace the frontend sequence of creating a group, patching the source, creating a RecipeItem, and patching the alternative with a dedicated endpoint, for example `POST /api/recipes/{recipe_id}/recipe-items/{item_id}/alternatives/`. Accept an active `portion_id` and the required quantity/order fields; derive the Ingredient from that Portion rather than trusting a separately supplied Ingredient ID. Validate recipe edit permission, source item ownership, active portion, and Ingredient readability under the existing Food access policy. Draft status alone must not reject an otherwise readable Ingredient. Create/reuse the exchange group, assign positions, and create the new RecipeItem inside one database transaction. Return the full typed RecipeItem response. No Ingredient status or visibility is changed.

Keep general direct-gram RecipeItems supported. Enforce a non-null, matching portion only on the exchange-alternative operation and add defensive handling in embedding generation for legacy/direct-gram items. Audit existing exchange members before considering any database constraint; do not silently fabricate a name.

### 4. Normalize safe Food API errors end to end

Use a shared backend error response for handled server failures with a stable code, safe German message, and request ID. Log full exception details server-side with that request ID only. In the Food frontend, use a typed API error carrying HTTP status, code, and request ID; handle empty/non-JSON 5xx bodies without replacing the original status with a JSON parsing error. Give reads an explicit retry state and mutations explicit retry controls while preserving unsaved inputs. Check `response.ok` before parsing direct `fetch` responses (including ingredient portion lookups).

### 5. Prove the real UI path and make Food checks release-blocking

Add browser tests that exercise the actual meal action to the BuffetBuilder, template/catalog loading, selection, save, and reload. Add a browser test for selecting a readable draft Ingredient as an alternative and verifying its persisted name/portion after reload. Intercept a 500 in both workflows to test safe feedback and preserved inputs. Add corresponding backend API tests for permissions, draft status, invalid/mismatched portions, transaction rollback, and error serialization.

Extend `cloudbuild-pr.yaml` with Food frontend lint, TypeScript, Vitest, and production build checks. Run deterministic mocked Playwright tests as a separate required check; keep tests independent of production services, external AI, and live database credentials. Keep backend pytest and its existing checks required.

## Risks / Trade-offs

- [Existing repository-wide static-check baselines are not clean] → Full `frontend-food` lint reports 67 design-token/formatting errors in untouched files; full-backend Ruff format reports 41 pre-existing files; prior full-backend MyPy runs reported numerous legacy errors in unrelated modules. Release gates therefore lint/format the touched frontend/backend files and MyPy-check the changed backend modules; full-baseline cleanup remains separate work and is not attributed to this change.
- [Active deploy identity permissions are unresolved] → The active main trigger uses `inspi-dev@inspi-441320.iam.gserviceaccount.com`; its visible project-level binding is `roles/storage.admin`. Recent trigger builds failed at `push-backend`, and the Artifact Registry resource policy could not be read with the available IAM. Release checks now run inline (no nested Cloud Build submission), but verify Artifact Registry push and Cloud Run deploy permissions before rollout.
- [Conservative Cloud Run limits reduce peak throughput] → Derive settings from the measured database capacity, load-test them, and alert before the budget is exhausted; consider a larger database tier only with explicit cost approval.
- [Database-side percentile/histogram queries may differ from current Python calculations] → Add fixture-based parity tests for empty, single-value, duplicate, and outlier distributions before switching implementations.
- [A new atomic alternative endpoint changes the frontend mutation path] → Keep the existing exchange API available for other callers until searches confirm it is unused; test all API clients and document the new Pydantic/Zod response contract.
- [Some users may not have read access to a system draft] → Preserve existing access policy and distinguish “not readable” from “draft status”; do not broaden global ingredient search visibility.
- [Existing exchange groups contain malformed data] → The authorized report-only audit found four groups and eight findings. After approval, only the three empty unnamed group rows were removed; a repeat report-only audit found the two portionless members remain. Their ingredient identity cannot be safely inferred. Do not modify those recipe items or add constraints until the content owner approves a mapping/removal plan.

## Migration Plan

1. Read-only production inspection confirmed `max_connections=25`, the current request envelope exceeds the available budget, and the proposed envelope calculates within it. Load-test and approve the reduced limits before rollout.
2. Deploy the capacity and statistics changes with dashboards/alerts before changing recipe mutation behavior.
3. Deploy the backend error contract and atomic alternative endpoint; run the report-only audit of existing exchange data.
4. Deploy the Food frontend using the new endpoint and status-aware error handling.
5. Enable the expanded PR/release gates and verify the Buffet and draft-alternative E2E workflows.
6. Roll back the frontend to the prior image if UI regressions occur. Keep the new backend endpoint additive during rollout. Revert Cloud Run limits only to a previously measured safe configuration; do not restore the known connection-exhausting settings.

No database schema migration is planned. The three approved empty-group rows were removed in one guarded transaction that rechecked their emptiness; the remaining portionless members were not changed. Any further repair or constraint requires a trusted ingredient mapping, content-owner approval, and a separate rollback plan.

## Open Questions

- The active main trigger auto-detects `cloudbuild.yaml`; the separate PR trigger is not deployed. The deploy pipeline now runs checks inline, but its service account's Artifact Registry and Cloud Run permissions must be verified before rollout.
- What exact safe instance/concurrency values meet product latency needs after querying Cloud SQL `max_connections` and load testing?
- Does the existing request middleware already generate a correlation ID that can be reused, or is a middleware addition needed?
- Which existing recipe items without portions are legitimate direct-gram entries versus malformed exchange alternatives? Resolve with a report-only data audit before adding any DB constraint.
