# Design: food-audit-followup

## Context and scope

This follow-up is limited to the defects not covered by the existing `food-audit-bugfixes` proposal. Its first implementation priority is reliable meal-plan ingredient search and access scoping. Touch behavior, measure semantics, wizard validation, shopping display, and recipe-step consistency follow after their expected behavior is agreed and covered by the delta specs.

## Decisions

### D1: Filter ingredient eligibility before pagination
`GET /api/ingredients/` and the planner's ingredient-search path SHALL filter deleted, draft, and otherwise non-selectable records before counting and paginating. Search relevance SHALL be the primary ordering; a stable identifier SHALL be the final tie-breaker. The frontend MUST NOT re-sort merged results in a way that discards backend relevance.

The response remains the existing paginated shape `{ items, total, page, page_size, total_pages }`. Any added search filters belong in the Pydantic filter schema and its matching Zod/query-hook contract. No new route is planned unless code inspection shows the current endpoints cannot express the required search.

### D2: Owner filtering is server-enforced
The meal-plan list endpoint (`GET /api/meal-plans/`) SHALL interpret the existing “Meine Pläne” filter as an owner-only filter for the authenticated user. Staff visibility and collaborator access MUST NOT silently widen that filter. The normal paginated response shape remains unchanged. The frontend MUST use API ownership/filter fields and MUST NOT infer permissions from a role name.

### D3: Measure conversion has one canonical mass basis
All standard-measure and ingredient-portion conversions SHALL pass through one canonical gram-value calculation. The design MUST distinguish measures only when they represent genuinely different volumes or weights; if names collide, the UI SHALL display the distinction. Density is applied once to volume measures and never to mass measures. The expected data values and rounding tolerance need to be confirmed in tests before implementation.

### D4: Touch and field-level validation
The Omnibar primary action SHALL be available within the dialog's scrollable region at 320 px and shall not require hover. Recipe-wizard validation SHALL expose a field-level error in addition to any toast. Existing German UI labels and design-system tokens remain in use.

### D5: Recipe and shopping display use canonical data
Shopping item display SHALL use the linked ingredient and stored canonical quantity when a safe match exists; ambiguous free text remains unlinked. Recipe instruction display SHALL preserve Markdown instructions and structured steps without displaying duplicates.

## Impacted files

- Backend: `backend/supply/api/ingredients.py`, the ingredient Pydantic schema package, `backend/planner/api/meal_plan.py`, planner list/search services and schemas, `backend/shopping/api.py`, `backend/shopping/schemas.py`, and recipe detail schemas/services.
- Frontend: `frontend-food/src/pages/planning/RecipeSearchDialog.tsx`, meal-plan query hooks and `schemas/mealPlan.ts`, `frontend-food/src/pages/planning/SettingsPanel.tsx`, recipe wizard pages and schemas, shopping-list display components and schemas, and recipe detail components.
- Tests: corresponding `backend/{supply,planner,shopping,recipe}/tests/` modules and focused Vitest tests alongside changed Food-frontend components.

## API and schema changes

- `GET /api/ingredients/`: existing search endpoint. Confirm or extend search/status eligibility filters; keep pagination parameters and response envelope. Update the matching Pydantic ingredient-list filter/response schema and `frontend-food/src/schemas/supply.ts` Zod schema/query hook together.
- `GET /api/meal-plans/`: keep the existing endpoint and response envelope. Ensure the “mine” filter means `owner=request.user`; update the planner Pydantic and `frontend-food/src/schemas/mealPlan.ts` only if response/query contracts change.
- Shopping-list APIs: no route change is assumed. If matching metadata or display fields change, update Pydantic `ShoppingListItemOut` / source schemas and matching `frontend-food` Zod schemas.
- Recipe detail API: preserve its current endpoint. If step-source fields need to change, update the recipe Pydantic schema and its Zod counterpart in the same change.

## Migration requirements

No database migration is expected for search filtering, owner scoping, responsive behavior, or field validation. A migration is not authorized by this proposal unless implementation proves that recipe instructions or measure definitions cannot be represented consistently without one. If needed, document the backfill, reversibility, and deployment order before creating it.

## Risks and open decisions

- Ingredient status fields and the exact query path must be confirmed before implementation; no assumption should cause draft or deleted records to leak into selection.
- The canonical volume for “Tasse” and standard measures (200 ml vs other existing values) requires a product decision and regression examples; do not silently normalize existing data.
- Recipe description Markdown may contain both general description and preparation instructions; avoid duplicating it when structured steps already exist.
- Owner-only filtering must preserve explicit staff administration and collaborator workflows outside “Meine Pläne”.
