# Block A: Code PR (groups 1–4, 5.5, 6.1–6.2)

Ships via main. No infrastructure changes beyond the deploy workflow.

## 1. Backend: quantity warnings off the list detail

- [x] 1.1 Query-count regression test: detail of a meal-plan-sourced list (meals with ingredient and recipe items) has the same query count for small and large plans/lists
- [x] 1.2 Rewrite `planner/services/quantity_plausibility.check_meals` with batched prefetching (meal items, recipes, recipe items, portions, overrides); make `active_recipe_items` use prefetched data; test constant query count and unchanged warning results
- [x] 1.3 Add `GET /api/shopping-lists/{id}/warnings/` (`list[QuantityWarningOut]`, same access rules as detail, empty for non-meal-plan or deleted plans); tests for member, guest, manual list, anonymous
- [x] 1.4 Remove `warnings` (and `quantity_warnings` attachment) from `get_shopping_list` / `ShoppingListDetailOut`; adjust existing tests

## 2. Frontend-food: schema sync and warnings hook

- [x] 2.1 Zod: remove `warnings` from `ShoppingListDetailSchema`; keep `QuantityWarningSchema` in sync with `QuantityWarningOut`
- [x] 2.2 Add `useShoppingListWarnings(listId, enabled)` in `frontend-food/src/api/shoppingLists.ts`
- [x] 2.3 `ShoppingListDetailPage.tsx`: navigation-state warnings first, otherwise the hook; no request in shop mode; update page tests

## 3. Backend: PDF semaphore and runtime limits

- [x] 3.1 `core/services/pdf_rendering.render_html_to_pdf`: module-level `BoundedSemaphore(1)` around the WeasyPrint render; test that two concurrent renders do not overlap
- [x] 3.2 Runtime limits concurrency 4 / workers 1 / threads 4 / max instances 3 in `.github/workflows/deploy.yml`, `Dockerfile.backend`, `Makefile`, `terraform/variables.tf`; update `core/tests/test_runtime_limits.py`
- [x] 3.3 Review module-level mutable state used in request paths for thread safety; fix findings
- [x] 3.4 Update DB capacity budget (`check_database_capacity` defaults/tests, alert documentation text in `terraform/main.tf`) for 3 × (4 + 1) against `db-g1-small`

## 4. Backend: fast cold start

- [x] 4.1 Test: importing the WSGI app and resolving the URLconf does not load `google.genai`, `google.cloud`, `grpc`
- [x] 4.2 Move those imports into the functions that use them until 4.1 passes
- [x] 4.3 `Dockerfile.backend`: compile bytecode for dependencies (`UV_COMPILE_BYTECODE=1`) and app code (`compileall`); Gunicorn `--preload`
- [x] 4.4 Measure local startup time before/after (WSGI import + URLconf)
- [x] 5.5 Deploy workflow: remove the stale `europe-west3` Cloud SQL mount

## 6. Verification (Block A)

- [x] 6.1 Run backend (`uv run pytest`) and food frontend tests, lint and type checks
- [ ] 6.2 Merge via main; verify CI deploy, cold start time, list latency and absence of 429 in logs

# Block B: Terraform (apply only with explicit OK)

## 5. Infrastructure

- [ ] 5.1 Service account `backend-warm-scheduler` with `roles/run.developer` on the backend service and `roles/iam.serviceAccountUser` on the runtime service account
- [ ] 5.2 Cloud Scheduler jobs `backend-warm-open` (16:00) and `backend-warm-close` (22:00, Europe/Berlin) patching service-level `scaling.minInstanceCount`; `ignore_changes` for the service-level min instance count
- [ ] 5.3 Alert policies for backend 429 and p95 latency > 5 s; uptime check on `/api/auth/providers/` with alert
- [ ] 5.6 Check `inspi-prod` usage (connections over 30 days) and report
- [ ] 6.3 With OK: `tofu plan` and `apply` for 5.1–5.3; verify the warm window at the next 16:00/22:00

# Block C: Database tier (separate OK, quiet window)

- [ ] 5.4 `db_tier` default `db-g1-small`
- [ ] 6.4 With separate OK: DB tier upgrade in a quiet window; verify memory and latency afterwards
