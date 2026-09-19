## Context

The food frontend already has a recipe wizard, URL/smart-input import, ingredient matching, AI ingredient enrichment, ingredient editing, and portion editing. The backend currently combines parsing, matching, enrichment, portion assignment, and persistence in several flows. Some flows can create draft ingredients or apply AI quantity changes before a user has reviewed the result.

The change spans `backend/recipe`, `backend/supply`, and `frontend-food`. It must preserve session authentication, keep Pydantic and Zod contracts synchronized, and remain usable from 320px upward. The selected product behavior is local-only review state: no new ingredient or portion is persisted until the final recipe save succeeds.

## Goals / Non-Goals

**Goals:**

- Add a conditional recipe wizard step before `Zutaten` for AI-derived ingredient data.
- Represent every imported or AI-suggested row as an explicit review item with source, explanation, candidates, quantity, portion, and status.
- Reuse the existing ingredient and portion editor views against temporary draft data.
- Support multiple URLs and pasted text as one combined analysis input.
- Make AI actions on existing recipes preview-only and apply them through the same review model.
- Commit confirmed recipe, ingredient, and portion data atomically at final save.
- Preserve the local review state and explain validation or server failures at the affected field.

**Non-Goals:**

- Changing the standalone ingredient creation page outside the recipe AI/import flow.
- Adding a server-persisted import-session or resume feature.
- Automatically learning from user decisions or changing matcher thresholds.
- Allowing AI to publish recipes or silently alter existing recipe data.

## Decisions

### 1. Local review aggregate, not database drafts

The frontend owns a typed review aggregate containing immutable source rows, candidate matches, selected ingredient/portion data, field-level draft values, and explicit row status. The backend receives only the fully confirmed aggregate in the existing recipe creation/update request, extended with temporary ingredient payloads where necessary. This avoids orphaned ingredients and matches the requirement that cancellation discards everything.

Alternative considered: a server-side import session. It would support resume, but adds lifecycle cleanup, authorization, and migration complexity that is not required.

### 2. One shared review contract for imports and existing-recipe AI actions

Import preview and AI actions on an existing recipe SHALL return the same review-row shape. A source row contains `source_text`, `sources`, `suggested_ingredient`, `candidates`, `suggested_portion`, `suggested_quantity`, `reason`, `technical_details`, and `status`. Existing recipe actions use the current recipe item as the original value and omit source URLs where none exist.

Alternative considered: separate import and edit dialogs. That would duplicate confirmation rules and make behavior diverge.

### 3. Backend preview services are side-effect free

Matching, enrichment, and portion assignment gain preview paths that never call `create()` for ingredients or portions. New ingredient enrichment returns a complete temporary payload. Final persistence validates and creates temporary records inside one `transaction.atomic()` boundary before creating or updating recipe items.

Existing direct-write AI endpoints SHALL be changed to return preview data or route through the review service. The final write endpoint SHALL reject unresolved or unconfirmed rows.

### 4. Existing editors operate on draft adapters

The frontend ingredient and portion editors receive the same field shape as normal editing, but their save callbacks update the review aggregate instead of calling persistence mutations. This preserves the established editing experience without allowing accidental database writes.

### 5. Multiple sources remain attributable

The import request accepts a list of typed sources (`url` or `text`). Extraction results retain one or more source references on each row. Conflicting source values are returned together with an AI recommendation and a human-review flag; no source is automatically authoritative.

### 6. Errors preserve state and use existing API conventions

Validation errors identify row and field paths in the typed error response. The frontend renders the error at the affected editor field and a German summary at the review level. Transient failures offer retry without clearing local data.

## API and File Impact

- `backend/recipe/services/ai_ingredients_service.py`: side-effect-free preview and explicit finalization inputs.
- `backend/recipe/services/ingredient_matcher.py`: expose candidates, method, confidence, and explanation data consistently.
- `backend/recipe/services/ingredient_enrichment.py`: return complete temporary enrichment data without creating records.
- `backend/recipe/services/url_import_service.py`, `import_service.py`, and recipe AI service/API modules: accept multiple sources and return review previews.
- `backend/recipe/schemas/`: add synchronized source, review-row, candidate, temporary ingredient, and finalization schemas.
- `backend/recipe/api/`: add or adjust preview and finalization endpoints; all require session authentication and edit permission where applicable.
- `frontend-food/src/components/recipe/RecipeWizard.tsx`: conditional step before ingredients and final-save gating.
- `frontend-food/src/components/recipe/`: add review rows/panel and source input controls; adapt existing ingredient/portion editors to draft callbacks.
- `frontend-food/src/store/`: add typed local review state with explicit status transitions and dirty navigation protection.
- `frontend-food/src/schemas/` and API hooks: mirror all Pydantic contracts.

## Risks / Trade-offs

- [Risk] The local aggregate can become large for long pasted pages. → Limit source text and preview row payloads according to existing import limits and avoid duplicating full text per row.
- [Risk] Reusing editors may accidentally trigger existing mutations. → Use explicit draft-mode props and tests asserting no mutation is called before final save.
- [Risk] Final atomic creation can fail due to stale ingredient/portion choices. → Revalidate IDs, ownership/visibility, and all required fields inside the transaction; return field paths.
- [Risk] AI explanations may sound authoritative. → Label them as suggestions, show technical matcher details separately, and require explicit confirmation.
- [Risk] Existing AI endpoints have consumers expecting immediate writes. → Update their food frontend callers together; no backward compatibility is required in this active-development project.

## Migration Plan

No database migration is planned. Deploy backend preview/finalization contracts and tests first, then frontend review flow and callers. Existing persisted recipes remain unchanged. Rollback consists of reverting the frontend feature flag/route integration and the preview endpoint changes; no data cleanup migration is needed because unconfirmed temporary data is never persisted.

## Open Questions

- Exact endpoint names can follow the existing recipe API route conventions during implementation.
- The implementation must confirm which existing editor component boundaries support draft callbacks without duplicating UI.
