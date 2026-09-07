## Context

The recipe-item API currently accepts a client request identifier on create, but replay semantics are not modeled as a first-class backend contract. The frontend prevents duplicate clicks in the normal wizard path, while retries from another client or a lost response can still be ambiguous. Recipe visibility and moderation status are also implemented in separate recipe PATCH, visibility, and wizard-completion paths and need one explicit testable lifecycle.

The change must preserve session authentication, the existing normalized recipe quantity model, and the separation between `frontend-food` and the main frontend. Sentry is explicitly out of scope.

## Goals / Non-Goals

**Goals:**

- Make recipe-item create/replay behavior deterministic for an authenticated user and recipe.
- Return the original authoritative item for a repeated request identity instead of creating a duplicate.
- Reject reuse of one request identity with a different logical payload.
- Ensure failed transactions do not reserve an idempotency identity permanently.
- Test private/group/public completion and the `draft -> submitted -> approved` lifecycle.
- Keep Pydantic and frontend TypeScript/Zod request contracts aligned.
- Clean only Ruff findings in directly touched production files.

**Non-Goals:**

- No Sentry dependency or telemetry setup.
- No general idempotency framework for unrelated APIs.
- No redesign of recipe visibility or moderation UX.
- No change to `RecipeItem.quantity` normalization or portion mathematics.
- No unification of the Wizard and standalone import UIs.

## Decisions

### 1. Persist request identity separately from mutable recipe data

Introduce a small recipe-scoped idempotency record, or an equivalent constrained persistence structure, containing the authenticated user, recipe, request key, operation type, request fingerprint, and resulting RecipeItem reference. The unique key SHALL be scoped to user, recipe, operation, and request key. This avoids treating identical ingredient payloads as duplicates while making retries deterministic.

Alternative: deduplicate by portion, quantity, note, and sort order. Rejected because two legitimate identical ingredients can be intentional and because mutable payload fields are not request identity.

### 2. Fingerprint conflicts explicitly

On replay with the same identity, the backend compares a canonical fingerprint of the logical create payload. A matching fingerprint returns the original item. A different fingerprint returns a clear conflict response and does not mutate the existing item or record.

Alternative: silently overwrite the original item. Rejected because a reused key usually indicates a client bug or replay corruption.

### 3. Keep idempotency and item creation atomic

The create operation runs in one transaction. The request record and RecipeItem are created together, and an integrity race is resolved by reloading the existing record and comparing fingerprints. If item creation fails, no completed idempotency record remains.

Alternative: write the idempotency record after item creation. Rejected because a timeout or process failure between the two writes permits duplicate retries.

### 4. Treat status lifecycle as an integration contract

Tests SHALL exercise the existing rules rather than introduce a new status service: private and group recipes remain drafts on completion, public completion submits a recipe for moderation, and staff approval transitions it to approved. The visibility endpoint and wizard preview completion must agree on ingredient prerequisites and permissions.

Alternative: move all transitions into a new state-machine library. Rejected as unnecessary for this focused hardening change.

### 5. Limit lint cleanup to touched production files

Run Ruff on files changed for idempotency/status behavior and fix actionable findings there. Existing unrelated test and whitespace findings remain separate work and are not reformatted opportunistically.

## Risks / Trade-offs

- **[Risk]** A new persistence structure requires a migration and cleanup semantics. → Keep it narrowly scoped, index the lookup fields, and document retention/cleanup behavior.
- **[Risk]** Concurrent requests can race before either sees the other record. → Use a database uniqueness constraint and handle the integrity race inside the transaction.
- **[Risk]** Old clients may not send a request key. → Preserve current behavior for requests without an idempotency key; only keyed requests receive replay guarantees.
- **[Risk]** Status tests may expose existing API/frontend disagreement. → Make the backend lifecycle authoritative and update the completion path to use the same validation rules.
- **[Trade-off]** Request records add one lookup and one write for keyed creates. → This is acceptable for correctness and limited to recipe-item mutations.

## Migration Plan

1. Add the idempotency model/constraint and migration.
2. Add backend schemas, transaction handling, fingerprint comparison, and API tests.
3. Update frontend request types/hooks to send stable request keys for new editor rows.
4. Add status-lifecycle integration tests and adjust only the completion behavior required by the existing contract.
5. Run targeted Ruff, backend/frontend suites, E2E lifecycle coverage, and `makemigrations --check`.

Rollback consists of reverting the application code and migration. Existing recipe items remain valid; idempotency records can be left unused or removed in a follow-up rollback migration if deployment policy requires it.

## Open Questions

- Should idempotency records be retained indefinitely for audit/replay safety, or cleaned after a bounded period?
- Should keyed update/delete operations be included in this change, or only create operations where duplicate RecipeItems are possible?
- Should public completion call the existing visibility endpoint, or should the preview completion PATCH remain the single frontend call?
