## Why

AI-assisted recipe imports and recipe AI actions can currently turn ingredient matches, portions, and newly enriched ingredients into recipe data without one consistent, explicit human review. This risks incorrect mappings, unverified nutrition data, and unwanted database records. The food workflow needs a human-controlled review step before any AI-derived recipe ingredient data is persisted.

## What Changes

- Add an ingredient review step immediately before the recipe wizard's ingredient step for AI imports and AI actions.
- Show every extracted ingredient as a reviewable row, including immutable source text, source provenance, AI match, portion, quantity, explanation, and status.
- Require explicit confirmation for every row, including exact matches; provide an explicit bulk action for complete rows.
- Let users choose AI candidates, search for another existing ingredient, add extra ingredients, or request a complete new ingredient draft when no existing ingredient fits.
- Reuse the existing ingredient and portion editing views for reviewing AI-created ingredient details and portions without persisting them during review.
- Support multiple URLs and pasted recipe or website text as combined import sources and expose source provenance per row.
- Keep the entire import local until final recipe save; discard it on cancellation or confirmed navigation away, and retain it after save failures with actionable error messages.
- Apply the same review flow to AI quantity, portion, replacement, and ingredient suggestions on existing recipes.

## Capabilities

### New Capabilities

- `recipe-ingredient-review`: Human-controlled review, editing, confirmation, temporary state, and final persistence for AI-derived recipe ingredient data.
- `recipe-multi-source-import`: Combined URL and pasted-text sources with per-ingredient provenance and conflict review.

### Modified Capabilities

- `recipe-url-import`: URL import must route extracted ingredient data through the review step and support additional sources after extraction failure.
- `recipe-ai-suggest`: AI ingredient, quantity, portion, and replacement suggestions must be preview-only until explicitly confirmed.
- `ingredient-matching`: Ingredient matching must expose candidates, confidence, method, and reasons for human selection rather than silently creating unresolved ingredients.

## Impact

- Backend `recipe` import, AI suggestion, ingredient matching, enrichment, and recipe-item persistence services and Django Ninja schemas/APIs.
- Backend `supply` ingredient and portion schemas/services used by the existing ingredient editor.
- Food frontend recipe wizard, import flow, ingredient review UI, existing ingredient editor integration, Zod schemas, TanStack Query hooks, and local review state.
- New API contracts must remain synchronized between Pydantic and Zod schemas.
- Recipe and ingredient writes must be atomic at final save; no model migration is required unless implementation chooses server-backed metadata, which is out of scope for the local-only review design.
