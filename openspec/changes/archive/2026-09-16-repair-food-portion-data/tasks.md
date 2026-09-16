## 1. Audit Model And Scanner

- [x] 1.1 Add repair finding/audit models, statuses, confidence, prompt version, before/after snapshots and migration.
- [x] 1.2 Implement deterministic candidate scanning for piece names, 1-g placeholders, missing weights, unit mismatches and implausible rank-1 portions.
- [x] 1.3 Add dry-run reporting and idempotent finding creation.
- [x] 1.4 Add scanner tests for valid gram portions, suspicious pieces, repeated scans and soft-deleted records.

## 2. AI Repair And Safe Apply

- [x] 2.1 Define Pydantic AI repair response schemas and Gemini prompt with structured classification, proposed portion and confidence.
- [x] 2.2 Implement configurable high-confidence threshold and pending-review behavior.
- [x] 2.3 Implement safe application for unreferenced portions and replacement-portion/rebind logic for referenced portions.
- [x] 2.4 Protect active meal-plan variants, enforce transaction boundaries and collect affected recipes for cache recalculation.
- [x] 2.5 Add management command flags for `--dry-run`, `--apply` and confidence threshold.
- [x] 2.6 Add backend tests for high/low confidence, referenced portions, idempotency, rollback and cache invalidation.

## 3. Staff API And Food Frontend

- [x] 3.1 Add staff-only paginated finding list, detail, apply and reject endpoints with Pydantic schemas.
- [x] 3.2 Add matching Food Zod schemas and TanStack Query hooks.
- [x] 3.3 Add repair findings to the Data Quality dashboard with confidence, before/after values and affected recipe counts.
- [x] 3.4 Add apply/reject confirmation dialogs, loading/error states and audit result toasts.
- [x] 3.5 Add frontend tests for staff access, pagination, apply and reject flows.

## 4. Rollout And Verification

- [x] 4.1 Run the dry-run scanner against representative production-like data and review counts before enabling apply.
- [x] 4.2 Run affected recipe, nutrition, price, shopping and planner consistency tests after a controlled apply.
- [x] 4.3 Run `uv run python manage.py makemigrations --check` and the full backend test suite.
- [x] 4.4 Run Food frontend typecheck, lint and data-quality tests.
