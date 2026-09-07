## Context

Food behavior is currently distributed across many archived and canonical specs. Several files describe the same contract with different names or formulas. The affected implementation spans `backend/supply`, `backend/recipe`, `backend/planner`, `frontend-food`, and their API/Zod schemas.

## Goals / Non-Goals

**Goals:**

- Establish one canonical owner for each shared Food rule.
- Align model terminology, calculation formulas, and search semantics.
- Make the resulting specs short enough to be maintained.
- Identify required API, schema, and migration work before implementation.

**Non-Goals:**

- No new Food feature beyond resolving the documented contracts.
- No compatibility aliases for removed terminology.
- No implementation of the backend or frontend in this change proposal.

## Decisions

1. **Use focused delta specs instead of rewriting all archived specs.** Archived changes remain historical; canonical specs receive only the changed requirements. This avoids duplicating old implementation history.
2. **Keep `Ingredient` standalone.** `Supply` remains the shared base for `Material`; ingredient nutrition and pricing do not inherit Supply fields.
3. **Use `portions=1` as the recipe storage invariant.** `RecipeItem.quantity` is implicitly per portion. Importers normalize source servings before persistence; `quantity_type` is removed rather than aliased.
4. **Centralize meal scaling in `effective_portions`.** Every meal-level quantity, nutrition, cost, shopping-list, and cooking-plan calculation calls the same resolution rule.
5. **Treat Meal-Plan nutritional tags as exclusions.** Search and contextual suggestions filter out recipes or ingredients matching any plan exclusion tag. General recipe suggestions remain a separate capability unless explicitly connected to Meal Plans.
6. **Synchronize API and frontend contracts together.** Backend Pydantic schemas and Food-frontend Zod schemas use `portions`, `image_url`, and nullable preview fields consistently.

## Risks / Trade-offs

- [Existing data uses legacy servings or `quantity_type`] → Add an explicit normalization migration/management command and fail validation for remaining legacy rows.
- [Archived specs still contain old wording] → Mark canonical specs as the source of truth and add governance checks for new changes; do not rewrite historical archives.
- [Changing tag semantics can alter search results] → Add backend and frontend tests for exclusion behavior and document the API parameters.
- [Spec validator rejects legacy formats] → Run targeted validation on the new change and repair only touched capability artifacts.

## Migration Plan

1. Inventory backend fields, serializers, API parameters, frontend schemas, and existing migrations.
2. Add or update migrations for recipe normalization and removal of obsolete fields only after confirming the live model state.
3. Update calculation services and search endpoints, then synchronize Pydantic and Zod schemas.
4. Run focused backend tests with `uv run` and Food-frontend type/tests.
5. Validate the change artifacts and archive only after implementation is complete.

Rollback is a normal migration rollback for schema changes. Since backward compatibility is not required, no long-term compatibility layer is planned.

## Open Questions

- Does the current database still contain a persisted `quantity_type` column, or is it only present in stale import code/specs?
- Which exact API parameter name should expose Meal-Plan exclusion tags (`exclude_nutritional_tag_ids` versus a plan-derived internal filter)?
- Should `recipe-suggestions` remain positive-tag based for non-Meal-Plan callers, or be split into a separate explicit capability?
