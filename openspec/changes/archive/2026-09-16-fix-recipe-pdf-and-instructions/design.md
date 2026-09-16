## Context

Recipes are normalized to one stored portion. The recipe PDF endpoint currently accepts only page format, reads quantities without a target scale, and builds preparation steps exclusively from `description`. Structured `RecipeStep` data is already available through the recipe API and is consumed by the cooking mode and parts of the planner, but not consistently by exports and read-only views.

## Goals / Non-Goals

**Goals:**

- Add an export-only serving context without changing normalized recipe storage.
- Render description and structured instructions as separate PDF sections.
- Use one structured-step resolver across recipe detail, cooking schedule and recipe PDF where possible.
- Preserve Markdown fallback for legacy recipes without structured steps.
- Correctly scale ingredient quantities, notes, placeholders, step ingredients and nutrition values.

**Non-Goals:**

- Do not remove the existing `description` field.
- Do not change the stored `Recipe.portions=1` invariant.
- Do not redesign the full recipe step editor.

## Decisions

### Export query parameter

Add `servings` (validated 1–100) to `GET /api/recipes/by-slug/{slug}/export/pdf/`. The Food `PdfExportDialog` owns the value and initializes it from one portion, independently of the current detail-page scaler.

### Shared export view model

Build an export-specific view model containing scaled ingredient rows, plain description, resolved structured steps, nutrition values, allergens, metadata labels and target servings. The PDF template receives only this view model rather than querying model relations itself.

### Structured-step priority and fallback

If structured steps exist, resolve placeholders and step ingredients from `RecipeStep`/`RecipeStepIngredient`. If none exist, parse Markdown description heuristically. The PDF still renders the description separately as requested, even when structured steps are present.

### Compatibility with generated descriptions

The existing structured-instructions compatibility mechanism may continue generating Markdown `description` from steps. The export labels that field `Beschreibung` and labels model steps `Zubereitungsschritte`; it does not silently treat one as the other.

### API and schema changes

- Recipe PDF endpoint accepts `servings`.
- No new response schema is needed for the binary PDF endpoint, but frontend URL construction must validate numeric input.
- Recipe detail schemas expose structured steps to read-only consumers as already defined; frontend rendering must not gate the read-only view on `can_edit`.

## Risks / Trade-offs

- [Description may duplicate step content] -> Keep sections visually distinct and preserve the user's explicit choice to export both.
- [Step placeholder quantities can diverge from ingredient list scaling] -> Resolve from the same target scale and central helper.
- [Legacy Markdown is ambiguous] -> Keep existing parser as fallback and add heading/list regression tests.
- [PDF generation is expensive] -> Keep serving context request-scoped and avoid writes or cache mutations during export.

## Migration Plan

1. Add endpoint parameter and export view model without changing stored recipes.
2. Add structured-step export/read-only rendering and tests.
3. Update frontend dialog and copy in the Food frontend.
4. Run PDF text/smoke tests and full backend/frontend contract tests.
5. Rollback by ignoring the optional `servings` parameter and retaining the old fallback path; no database rollback is required.
