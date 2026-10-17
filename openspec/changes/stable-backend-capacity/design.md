## Context

Incident analysis 2026-10-16 (17:25–20:00 MESZ, 3–5 concurrent users on one shared shopping list, ~2,350 backend requests, 236 × HTTP 429):

- Backend ran with request concurrency 1, 1 Gunicorn worker × 1 thread, max 2 instances (introduced by `reliable-pdf-exports`). Two slots in total.
- `GET /api/shopping-lists/{id}/` took ~8 s (median), ~4.8 s after `13eef0ca` removed the per-item portion/package N+1. Every check-off changes the list stamp, so every participant's 5 s pulse triggers a full reload at the same time → bursts of 4–5 heavy requests on two slots → Cloud Run queue timeout → 429.
- During saturation backend CPU was 15–40 % and Cloud SQL CPU 20–47 %: requests mostly waited on many sequential queries. Cloud SQL `db-f1-micro` sits at 100 % memory permanently.
- The remaining cost is `_quantity_warnings` → `planner/services/quantity_plausibility.check_meals`: 90 of 108 queries for a 44-entry meal-plan list (two queries per meal, two per recipe meal item), recomputed on every load although the meal plan does not change while shopping.
- Memory crashes (512 MiB) in Sept/Oct came mainly from `/api/ingredient-statistics/distributions/` (608 errors on 2026-09-28), only a few from PDF exports. Since 1 GiB (2026-10-05) there was no memory crash. 14 PDF exports in 30 days, 4–30 s each.
- Cold starts: Gunicorn logs "Listening" about 2 s after container start (`startup-cpu-boost` is already enabled), yet the first request took 15–24 s. The cause is not isolated: the worker imports Django lazily (no `--preload`), dependencies are not bytecode-compiled, and `google.cloud`/`grpc`/`google.genai` load at URLconf import (WSGI import measured locally at ~2.7 s, which is much less than 15–24 s). Queueing and first DB work are candidates. Preload and bytecode are expected to save only a few seconds; keeping instances warm is the main lever.
- Costs (30 days): backend 9.9 instance-hours, food frontend 6.0 → within free tier. Cloud SQL f1-micro ≈ 10 €/month each; a second instance `inspi-prod` (europe-west3) also runs.
- GitHub Actions deploy passes concurrency/max-instances/Gunicorn env explicitly; Terraform ignores `template` changes of the backend service.

## Goals / Non-Goals

**Goals:**
- No 429s and list detail < 300 ms server time for 10–20 concurrent food users.
- Reliable PDF exports without throttling the whole API.
- First request after idle in a few seconds; no cold start 16:00–22:00.
- Alerts before customers notice.
- Moderate cost increase (≈ +15–20 €/month).

**Non-Goals:**
- WebSockets in production (polling stays: 5 s active, 15 s idle, as on main).
- Delta sync of shopping list entries (possible follow-up).
- Separate PDF Cloud Run service.
- Decommissioning `inspi-prod` (only verification; separate decision).

## Decisions

### 1. Warnings move out of the list detail
`ShoppingListDetailOut.warnings` is removed; new endpoint:

- `GET /api/shopping-lists/{id}/warnings/` → `200 list[QuantityWarningOut]`, same access check as detail (`require_login_unless_guest` + `resolve_actor`), not paginated.

`check_meals` is rewritten to load all meals' items in one query with `prefetch_related` (ingredient items with `ingredient`, `measuring_unit`; recipe items with `recipe__recipe_items__portion…`, `overrides`), so the endpoint's query count is constant. `active_recipe_items` must use the prefetched `recipe_items`/`overrides` (no `.select_related()` on the related manager, which bypasses the prefetch cache).

*Alternatives:* caching warnings keyed by meal plan `updated_at` (cache invalidation on meal/recipe edits is fragile; recipe edits don't touch the plan); storing warnings at generation (stale after recipe fixes). A separate lazy request costs one cheap call only when the page is opened outside shop mode.

Frontend: `ShoppingListDetailSchema` drops `warnings`; `useShoppingListWarnings(listId, enabled)` (TanStack Query, key `['shopping-list-warnings', id]`, `enabled: !shopMode`, `staleTime` 5 min). `ShoppingListDetailPage.tsx` uses navigation-state warnings if present, otherwise the hook.

### 2. PDF semaphore instead of concurrency 1
`core/services/pdf_rendering.render_html_to_pdf` wraps WeasyPrint in a module-level `threading.BoundedSemaphore(1)`. All three exports already use this helper. Data preparation (DB queries) runs before the semaphore; only the memory-heavy render is serialized. A PDF request waiting for the slot holds one of 4 threads; with 14 exports/month this is acceptable.

Runtime limits: concurrency 4, `GUNICORN_WORKERS=1`, `GUNICORN_THREADS=4` (gthread), max instances 3, 1 GiB. Updated in `.github/workflows/deploy.yml`, `Dockerfile.backend`, `Makefile`, `terraform/variables.tf`; `backend/core/tests/test_runtime_limits.py` enforces consistency.

Memory: idle ≈ 400 MiB; one WeasyPrint render (previously crashing at 512 MiB total) plus 3 light requests fits 1 GiB. The memory alert (existing) stays.

*Alternative:* dedicated PDF service (more infra; revisit if PDF volume grows).

### 3. Database budget and tier
`db-g1-small` (max_connections 50). Budget: 3 × (4 threads + 1 background) = 15 + reserve (admin/migrations/jobs) ≪ 50. `CONN_MAX_AGE` stays 0. `check_database_capacity` defaults and the alert documentation text are updated. Terraform `db_tier` default → `db-g1-small`; the tier change restarts the instance (≈ 1–2 min downtime) → applied only with explicit OK in a quiet window.

The stale `run.googleapis.com/cloudsql-instances` entry `inspi-441320:europe-west3:inspi-db` is removed via `gcloud run services update --set-cloudsql-instances` in the deploy workflow. `inspi-prod` usage is checked via `num_backends`/connections over 30 days and reported.

### 4. Fast cold start
- `Dockerfile.backend`: `UV_COMPILE_BYTECODE=1` for the dependency install and `python -m compileall -q /app` after copying the code.
- Gunicorn `--preload`: app loaded in the master before forking. Expected to save a few seconds of worker import time, not the full 15–24 s; to be measured after deploy. Django does not open DB connections at import; `CONN_MAX_AGE=0` avoids inherited connections.
- Lazy imports: move `google.genai`, `google.cloud.*`, `google.api_core` imports into the functions that use them (`planner/services/meal_plan_ai_service.py`, `core/services/ai_budget.py`/`core/errors.py`, `event/services/export.py`, others found by a test). A test imports the URLconf and asserts these modules are absent from `sys.modules`.

### 5. Warm window 16:00–22:00
Two `google_cloud_scheduler_job`s (`backend-warm-open` at `0 16 * * *`, `backend-warm-close` at `0 22 * * *`, `Europe/Berlin`) call `PATCH https://run.googleapis.com/v2/projects/{p}/locations/{r}/services/inspi-backend?updateMask=scaling.minInstanceCount` with body `{"scaling":{"minInstanceCount":1|0}}`, OAuth token of a new service account `backend-warm-scheduler` with `roles/run.developer` on the backend service and `roles/iam.serviceAccountUser` on the backend runtime service account.

Service-level `scaling.minInstanceCount` is independent of revisions: `gcloud run deploy` without `--min` keeps it. Terraform: the backend's service-level `scaling` gets `lifecycle.ignore_changes` for `scaling[0].min_instance_count` (currently template-level scaling is ignored via `template`).

*Alternatives:* permanent min-instances 1 (≈ 12–14 €/month), meal-plan-driven endpoint (more code; user chose a fixed window).

Cost: ~180 warm hours/month at idle pricing ≈ 3–4 €/month.

### 6. Alerts and uptime
Terraform `google_monitoring_alert_policy`:
- 429: `run.googleapis.com/request_count` with `response_code="429"`, service `inspi-backend`, sum over 5 min > 0.
- Latency: `run.googleapis.com/request_latencies` p95 > 5000 ms for 10 min.
- `google_monitoring_uptime_check_config` on `https://essensplan.app/api/auth/providers/` (unauthenticated, cheap) with an alert policy.
Notification channels: existing `var.monitoring_notification_channels`.

## Risks / Trade-offs

- [Threads expose thread-unsafe code (module-level caches, globals)] → review module-level mutable state in request paths; Django ORM is thread-safe per connection; run the full test suite; watch error logs after rollout.
- [Several requests compete for one vCPU] → measured CPU was low during the incident (I/O-bound); latency alert catches regressions; max instances 3 adds headroom.
- [`--preload` and fork with open resources] → no DB/HTTP clients created at import; lazy-import change reduces import side effects.
- [DB tier change restarts Cloud SQL] → apply in a quiet window with OK; rollback = tier back.
- [Scheduler job fails] → retry config; worst case cold starts as today.
- [Concurrency 4 but heavy endpoints still slow] → query-count tests for list detail and warnings; latency alert.

## Migration Plan

1. Merge code (warnings endpoint, N+1 fix, semaphore, lazy imports, Dockerfile, limits) via main → CI deploy (backend + food frontend together; frontend must not request `warnings` from the detail anymore – old frontends simply show no warnings).
2. Verify cold start and latency in logs.
3. With OK: `tofu plan`/`apply` for scheduler jobs, alerts, uptime check, backend scaling lifecycle.
4. With separate OK: DB tier upgrade in a quiet window.
5. Report `inspi-prod` usage; decommission only with separate OK.

Rollback: revert the merge commit (limits return to 1/1/2); `gcloud run services update-traffic --to-revisions` for an immediate rollback; scheduler jobs can be paused.

## Open Questions

- Is `inspi-prod` used by anything (old environment, backups)?
- Should warnings also be shown on the meal plan page instead of the shopping list (follow-up)?
