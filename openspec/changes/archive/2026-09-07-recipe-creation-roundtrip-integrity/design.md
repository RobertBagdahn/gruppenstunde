## Context

Recipe creation currently combines three persistence models inside one wizard:

```text
Step 0       AI/URL creation             server-side draft
Step 1       InlineIngredientEditor      per-item mutations
Step 2       metadata PATCH              recipe PATCH
Step 3       StepEditor                  local Zustand + batch PUT
Step 4       preview                     query-derived data
```

The global wizard navigation does not own the dirty state of the embedded ingredient and step editors. `StepEditor` also uses a shared Zustand store and hydrates it from the query whenever the component mounts, while its save action is local to the component. This permits edits to remain client-only or to be replaced by stale server data. Ingredient saves use multiple concurrent mutations, which makes duplicate submissions and stale invalidation behavior difficult to distinguish from valid additions.

There are also two URL import implementations. The wizard uses the enhanced Gemini-backed endpoint, while the separate import page uses the legacy parser endpoint. The legacy parser has incomplete Chefkoch fallback behavior and the two response shapes do not provide one consistent creation contract.

## Goals / Non-Goals

**Goals:**

- Make advancing from every wizard step persist the complete state of that step.
- Ensure recipe steps are saved exactly once before leaving Step 3 and are not rehydrated over dirty local edits.
- Ensure one ingredient save action cannot create duplicate RecipeItems or replay a completed mutation batch.
- Keep AI-generated and URL-imported ingredients and steps editable and durable across navigation and reload.
- Provide one consistent enhanced URL-import workflow with complete structured recipe data and explicit German error states.
- Keep backend Pydantic schemas and frontend Zod schemas synchronized.
- Add deterministic backend, component, and Playwright regression coverage.

**Non-Goals:**

- No redesign of recipe nutrition, portion mathematics, or ingredient matching algorithms beyond preserving their persisted values.
- No new AI provider or background job system.
- No generic autosave for the standalone recipe detail page.
- No support guarantee for arbitrary websites without structured recipe data or a supported fallback.
- No database migration unless implementation proves a persisted idempotency key is required; the preferred design is client-side mutation gating plus server-side transactional replacement semantics.

## Decisions

### 1. Wizard owns step persistence boundaries

`RecipeWizard` will receive explicit imperative save handles from the embedded ingredient and step editors, or the editors will expose a shared save callback whose promise is awaited by `handleNext`. The existing global `Weiter` action remains the single navigation trigger, but it will first flush the active editor and only advance after the save succeeds.

Alternative: add an independent save button and leave `Weiter` unaware of dirty state. Rejected because it allows the wizard to advance while edits are still unsaved and contradicts the existing creation-wizard contract.

### 2. Step editor hydration is identity- and dirty-aware

The step store will be scoped or reset per recipe slug. Initial server hydration will happen only when the active recipe identity changes or when the store has no local changes. Query refetches after a successful save may update the clean store, but must not replace dirty local content. The editor save promise will return the server result and clear dirty state only after the batch PUT succeeds.

Alternative: keep a global store and always call `setSteps` on every query update. Rejected because it is the direct path to losing manual edits when queries refetch.

### 3. Ingredient save is a guarded transaction from the user's perspective

The frontend will disable the save action while a save is pending and use one mutation orchestration for the current editor snapshot. Completion will invalidate recipe/item queries once, after all operations succeed. The editor will not submit the same snapshot twice, and it will refresh its local baseline from the successful response/query result.

The backend will preserve transactional behavior for multi-item mutations and tests will assert that repeated requests do not produce duplicate items. If the existing per-item API cannot guarantee this without a request identity, the implementation will add a narrowly scoped idempotency mechanism rather than broad compatibility code.

Alternative: deduplicate visually in the frontend after saving. Rejected because it hides persisted duplicate rows and cannot protect direct API callers.

### 4. Enhanced URL import is the canonical creation path

The wizard and standalone import page will use `POST /api/recipes/import-from-url-enhanced/` and the same Pydantic/Zod response contract. The legacy preview endpoint will either delegate to the canonical service or be removed from user-facing UI. The service will parse JSON-LD first, then supported microdata/host fallback, and return normalized `recipe_draft`, `recipe_items`, and `created_ingredients` data.

The canonical response remains:

```text
recipe_draft: title, description, summary, servings, times, choices, steps, source_url
recipe_items: ingredient_id, ingredient_name, quantity, measuring_unit_id/name,
              portion_id, note, is_new_ingredient
created_ingredients: id, name, aliases, nutri_class
```

The source URL will be passed through when the draft is created. Quantity normalization remains explicit and uses `servings`, not an alternate `portions` field.

Alternative: maintain two import implementations and patch only the Chefkoch fallback. Rejected because the current divergence makes one flow appear functional while the other fails and doubles contract/test maintenance.

### 5. Test external imports deterministically

Backend parser tests will use fixture HTML/JSON-LD and mock network/Gemini boundaries. Playwright tests will intercept the enhanced import endpoint and recipe-step/item APIs where external services would make tests slow or nondeterministic. At least one optional live smoke test may remain separate from the deterministic suite.

## Risks / Trade-offs

- **[Risk] Existing recipe-step pages rely on the shared Zustand store.** → Preserve the standalone editor behavior while adding recipe identity and explicit save state; cover both detail-page and wizard usage.
- **[Risk] Waiting for all ingredient mutations may expose partial failures.** → Use transactional backend operations where possible, retain clear error toasts, and refetch the authoritative recipe after failure/success.
- **[Risk] URL sources block automated requests or change markup.** → Keep structured-data parsing primary, classify source-unreachable/no-recipe/AI errors, and test graceful fallback without assuming every Chefkoch HTML shape.
- **[Risk] AI import creates ingredients before recipe confirmation.** → Keep the existing enhanced-service behavior for now, document it in tests, and avoid expanding this change into an ingredient staging system.
- **[Trade-off] A single canonical import endpoint may remove the simpler non-AI parser path from the UI.** → This reduces behavioral drift and provides one predictable preview contract; parser-only logic remains reusable internally for extraction.
- **[Trade-off] Explicit save-on-navigation is less immediate than true autosave.** → It matches the existing wizard interaction, minimizes API traffic, and makes failure/retry behavior visible.

## Migration Plan

1. Add or update backend parser, import, recipe-step, and recipe-item tests before changing the public flow.
2. Update the enhanced import contract and parser behavior without changing stored recipe rows or requiring a data migration.
3. Update frontend Zod schemas and hooks, then wire editor save promises into wizard navigation.
4. Add deterministic Playwright coverage for AI, manual, preparation, duplicate-prevention, and URL-import paths.
5. Run targeted backend tests, Food frontend checks, Playwright tests, `uv run python manage.py makemigrations --check`, and the full relevant test suites.

Rollback consists of reverting the application release. No schema migration is expected. If an idempotency key becomes necessary, it must be additive and receive its own migration and rollback note before implementation.

## Open Questions

- Should the visible labels be updated so the method-specific action is explicitly shown as `Generieren`/`Importieren`, or should the existing global `Weiter` wording remain and tests/specs be aligned to it?
- Should the legacy `/api/recipes/import-from-url/` endpoint remain as an internal compatibility endpoint, or be removed once all UI callers use the enhanced endpoint?
- Does the reported ingredient duplication reproduce through repeated clicks, through query hydration after a successful save, or through backend item replacement? The implementation tests must identify which mechanism is responsible before selecting an idempotency strategy.
