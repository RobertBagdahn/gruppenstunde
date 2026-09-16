## 1. Backend Weight Invariant

- [x] 1.1 Add a central service validation function that requires `weight_g > 0` for every active non-deleted `Portion`, while preserving safe metric/canonical calculation and rejecting piece-like implicit `1 g` fallbacks.
- [x] 1.2 Apply the invariant to manual create/update, AI apply, URL/text import, legacy/admin creation and portion confirmation paths with consistent HTTP 422 validation errors.
- [x] 1.3 Add backend tests for missing, zero, negative, automatically calculated, explicit and piece-like weights, including permission and duplicate-name failures.
- [x] 1.4 Enforce that new and updated `RecipeItem` rows cannot reference active portions without a positive trusted weight, while preserving readable warnings for historical rows.

## 2. Existing Data Repair

- [x] 2.1 Extend the portion integrity scan/repair service to classify active unweighted rows into deterministic repairs, AI/manual review and explicit deletion candidates without changing referenced weights in place.
- [x] 2.2 Add or update a management command and API response for repair findings, including source, confidence, proposed weight and affected recipe usage.
- [x] 2.3 Add tests for automatic repair, ambiguous piece portions, referenced portions, idempotent reruns and rollback on failed repair.
- [x] 2.4 Run the repair command against the target dataset, review unresolved findings and document the migration/release gate result.

## 3. Portions Magic-Wand Backend

- [x] 3.1 Add Pydantic schemas for magic-wand preview context, existing-row operations, new suggestions, manual weights, preview version and apply summary; export all public schemas.
- [x] 3.2 Implement a service that gathers ingredient details, aliases, portions, packages, nutrition, categories, physical properties and bounded recipe usage context for every fresh AI request.
- [x] 3.3 Implement structured AI parsing for replacement and new-portion suggestions, positive-weight validation, missing-weight manual-input states and case-insensitive duplicate detection.
- [x] 3.4 Add authenticated `POST /api/ingredients/{slug}/portions/magic-wand/preview/` with ingredient edit permission, fresh-request behavior and typed error handling.
- [x] 3.5 Add authenticated `POST /api/ingredients/{slug}/portions/magic-wand/apply/` with preview version checks, source-state revalidation and atomic soft-delete plus complete replacement/new creation.
- [x] 3.6 Ensure apply rejects stale sources, weighted sources selected for replacement, invalid manual weights, duplicate active names and unauthorized requests without partial mutation.
- [x] 3.7 Add backend integration tests for preview context, fresh requests, default selections, missing AI weights, apply success, stale conflict, deselected-source handling and transaction rollback.

## 4. Backend Contract Synchronization

- [x] 4.1 Extend `PortionOut` and related portion schemas with the final weight status/provenance and repair fields required by the preview and historical-warning flows.
- [x] 4.2 Add corresponding Food Zod schemas and API client types for preview operations, apply payloads, operation summaries and typed conflicts.
- [x] 4.3 Add contract tests proving representative Pydantic responses parse successfully through the Food Zod schemas without dropping nullable or status fields.

## 5. Food Frontend Magic-Wand UX

- [x] 5.1 Add a single portions magic-wand button beside “Portion hinzufügen” in `IngredientDetailPage`; do not add per-portion wand buttons.
- [x] 5.2 Add TanStack Query preview/apply mutations with fresh requests on every wand click and invalidation of ingredient/portion queries after successful apply.
- [x] 5.3 Build the confirmation dialog showing weighted unchanged portions, automatically selected unweighted replacements, independently selectable new typical portions and operation explanations.
- [x] 5.4 Add editable positive weight fields for missing AI values and for deselected unweighted sources; require explicit deletion without replacement when no weight is provided.
- [x] 5.5 Handle loading, empty, AI error, permission error, validation error, stale-preview conflict and success feedback with German UI text and mobile-first layout.
- [x] 5.6 Add frontend tests for exactly one wand, preview rendering, default selection behavior, weighted-row protection, checkbox selection, manual weight validation, explicit deletion and apply errors.

## 6. Recipe and Calculation Consumers

- [x] 6.1 Update recipe create/update and import flows to reject new references to unweighted active portions and preserve visible warnings for historical references.
- [x] 6.2 Audit nutrition, price, meal-plan and shopping calculations so no new unweighted portion is treated as a fabricated gram value.
- [x] 6.3 Add cross-consumer tests covering confirmed replacements, historical unresolved rows, cache invalidation and consistent weight warnings.

## 7. Migration And Release Verification

- [x] 7.1 Create any required migration for new preview/repair metadata and verify `uv run python manage.py makemigrations --check`.
- [x] 7.2 Run targeted backend tests for supply, recipe, planner, shopping and repair flows.
- [x] 7.3 Run `uv run pytest` and record unrelated baseline failures separately.
- [x] 7.4 Run Food frontend typecheck, lint, targeted Vitest tests and the complete Food frontend test suite.
- [x] 7.5 Run `openspec validate --change "portion-weight-magic-wand"` and review the final diff against the proposal, design and all capability specs.
- [x] 7.6 Decide whether the final database check constraint is included now or tracked as a follow-up after the repair dataset gate, and document the decision in the change artifacts.
