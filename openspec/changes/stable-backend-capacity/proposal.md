## Why

On 2026-10-16 a shared shopping list used by 3–5 people during an event made the backend reject 236 requests with HTTP 429 ("no available instance") within one hour. The list detail endpoint took ~8 s (still ~4.8 s after the first query fix), every check-off made all participants reload the full list, and the backend admits only one request per instance on at most two instances – a limit introduced to protect PDF rendering. Cold starts add 15–20 s after idle periods, and the database (`db-f1-micro`) runs permanently at 100 % memory. The food app must stay responsive for several concurrent users without trading away reliable PDF exports.

## What Changes

- **BREAKING** `GET /api/shopping-lists/{id}/` no longer returns `warnings`; meal-plan quantity warnings move to a separate, lazily loaded endpoint `GET /api/shopping-lists/{id}/warnings/`. The list detail must not compute meal-plan plausibility on load.
- Remove the per-meal/per-recipe N+1 in `planner/services/quantity_plausibility.check_meals`.
- Query-count regression tests for meal-plan-sourced shopping lists (detail and warnings).
- PDF rendering is bounded by an in-process semaphore (at most one concurrent WeasyPrint render per instance) instead of limiting the whole API to one request per instance.
- Backend runtime limits change from concurrency 1 / 1 thread / max 2 instances to concurrency 4 / 4 threads / max 3 instances (1 GiB), consistently in `deploy.yml`, `Dockerfile.backend`, Terraform defaults and the Makefile; the database connection budget is recalculated.
- Cold starts get faster: bytecode is compiled at image build, Gunicorn preloads the Django app, and heavy optional libraries (`google.genai`, `google.cloud`/`grpc`) are imported lazily. Expected gain is a few seconds; the main lever for cold starts is the warm window below.
- Backend is kept warm daily 16:00–22:00 Europe/Berlin (service-level min instances 1, otherwise 0) via two Cloud Scheduler jobs; deploys must not reset it.
- Cloud SQL `inspi-db-west1` is upgraded from `db-f1-micro` to `db-g1-small` in Terraform (applied only with explicit OK); the stale `europe-west3` Cloud SQL mount is removed; usage of the `inspi-prod` instance is verified before any decommissioning (separate OK).
- Alert policies for backend 429 rate and p95 latency plus an uptime check.
- Polling stays as on main (5 s active, 15 s idle).

## Capabilities

### New Capabilities
- `backend-cold-start`: Fast backend cold starts (precompiled bytecode, preloaded app, lazy heavy imports) and a daily warm window (min instances 16:00–22:00 Europe/Berlin) that deploys do not reset.

### Modified Capabilities
- `reliable-pdf-exports`: "Bounded PDF rendering resources" no longer mandates request concurrency 1; PDF renders are serialized per instance by a semaphore while other requests run concurrently.
- `food-runtime-capacity`: Connection budget reflects the new limits and the larger database tier; capacity failures (429 rate, p95 latency, availability) raise alerts.
- `shopping-list`: The detail response excludes quantity warnings and stays fast for meal-plan-sourced lists; warnings are available via their own endpoint.

## Impact

- Backend startup: `Dockerfile.backend` (bytecode, `--preload`), modules importing `google.genai` / `google.cloud` at import time (e.g. `planner/services/meal_plan_ai_service.py`, `core/services/ai_budget.py`, `event/services/export.py`).
- Backend apps: `shopping` (api, schemas, tests), `planner` (`services/quantity_plausibility.py`), `core` (`services/pdf_rendering.py`, capacity check, runtime-limit test).
- Pydantic: `ShoppingListDetailOut` drops `warnings`; new response schema `list[QuantityWarningOut]` for the warnings endpoint.
- Zod: `ShoppingListDetailSchema` drops `warnings`; new query hook `useShoppingListWarnings` in `frontend-food/src/api/shoppingLists.ts`.
- React pages: `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx` loads warnings via the new hook (not in shop mode).
- Infra: `.github/workflows/deploy.yml`, `Dockerfile.backend`, `Makefile`, `terraform/` (Cloud Run limits, Cloud SQL tier, Cloud Scheduler jobs + service account/IAM, monitoring alerts, uptime check).
- No database migrations.
- Cost: approx. +15 €/month for the DB tier, approx. +3–4 €/month for the warm window; possibly −10 €/month if `inspi-prod` is unused.
