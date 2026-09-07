## 1. Backend Idempotency Model

- [x] 1.1 Add a recipe-scoped idempotency record model containing user, recipe, operation, request key, canonical payload fingerprint, and resulting RecipeItem reference.
- [x] 1.2 Add the migration and database uniqueness constraint for `(user, recipe, operation, request_key)`; document retention and deletion behavior.
- [x] 1.3 Add typed backend request/response fields for the idempotency key and conflict response without changing legacy unkeyed requests.

## 2. Backend Recipe-Item Persistence

- [x] 2.1 Implement atomic keyed create handling that returns the original RecipeItem for matching replays.
- [x] 2.2 Reject request-key reuse with a different payload using a stable HTTP 409 error and German-safe client detail.
- [x] 2.3 Handle concurrent matching creates by catching the uniqueness race and reloading the committed idempotency record.
- [x] 2.4 Ensure failed item creation rolls back the idempotency record and permits a later retry with the same key.
- [x] 2.5 Add backend tests for first create, matching replay, conflicting replay, legacy unkeyed creates, failed retry, and concurrent behavior where supported by the test database.

## 3. Frontend Contract and Save Integration

- [x] 3.1 Update Food frontend recipe-item payload types and Zod contracts for the request identity and conflict error shape.
- [x] 3.2 Ensure new inline ingredient rows generate one stable request identity for their lifetime and reuse it across retries.
- [x] 3.3 Preserve current save gating and verify a failed mutation retry does not replay already successful item creates.
- [x] 3.4 Add component tests for request-key stability, conflict handling, and retry behavior.

## 4. Status Lifecycle Integration

- [x] 4.1 Add backend integration tests for private, group, and public visibility transitions and the `draft -> submitted -> approved` lifecycle.
- [x] 4.2 Verify public submission requires at least one RecipeItem and preserves draft status when validation fails.
- [x] 4.3 Verify staff approval exposes the recipe only after the `approved` transition and enforces permissions for non-staff users.
- [x] 4.4 Add Food frontend tests for Wizard completion behavior for private, group, and public recipes, including blocked navigation on status-save failure.
- [x] 4.5 Add deterministic Playwright coverage for the public submission and private/group completion paths.

## 5. Targeted Quality Cleanup

- [x] 5.1 Run Ruff on all directly touched production files and fix actionable import, undefined-name, and formatting findings there.
- [x] 5.2 Do not reformat unrelated Recipe test files; record remaining repository-wide Ruff findings separately.

## 6. Verification

- [x] 6.1 Run `uv run pytest` for the affected Recipe and Content tests.
- [x] 6.2 Run Food frontend tests, typecheck, build, and the focused Playwright project.
- [x] 6.3 Run `uv run python manage.py makemigrations --check` and verify Pydantic/Zod synchronization.
- [x] 6.4 Review the final diff and validate this OpenSpec change before implementation handoff.
