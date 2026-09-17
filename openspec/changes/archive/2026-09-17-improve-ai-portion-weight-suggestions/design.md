## Context

The existing portions magic wand in `backend/supply/services/portion_magic_wand.py` already uses a fresh structured Gemini request and exposes a preview/apply workflow. However, the prompt permits `proposed_weight_g` to be null, and the service forwards that result to the Food dialog as a manual-input case. This is safe for data integrity but weak for common foods where users expect an estimate, such as a hotdog bun.

The change must improve useful AI output without reintroducing fabricated technical values. Existing positive-weight portions remain immutable in the wand flow. New or replacement portions are still written only after explicit user confirmation and server-side validation.

## Goals / Non-Goals

**Goals:**

- Make the structured AI contract request positive weights for ordinary new and replacement portions.
- Ensure common piece foods receive a practical `Stück` estimate; `Hotdog-Brötchen` is a mandatory regression case with a plausible estimate around 55 g.
- Encourage additional practical portions, such as a typical package, only when the ingredient context supports them.
- Keep portion quantity, unit and total gram weight internally consistent.
- Add one bounded repair attempt for incomplete ordinary AI responses before exposing a manual-review state.
- Show estimated weight, confidence and rationale in the Food confirmation dialog.
- Preserve the preview token, atomic apply, active-weight validation, provenance and stale-preview protections.

**Non-Goals:**

- No automatic persistence of AI suggestions.
- No universal hard-coded weight table or silent fallback such as `1 g`.
- No replacement of already weighted portions.
- No change to package purchasing semantics or recipe calculations.
- No new database migration unless implementation proves that additional persisted provenance is required.

## Decisions

### 1. Strengthen the structured AI prompt and schema semantics

The prompt will classify ordinary foods into a practical serving form before estimating weight. For piece-like foods it must produce at least one `Stück`-style operation with a positive total weight. For `Hotdog-Brötchen`, the expected range is 50–60 g for a normal bun, with the model free to adjust for explicit size or product context. The response continues to include `confidence` and `rationale`, so uncertainty is visible rather than encoded as a fabricated exact fact.

`proposed_weight_g: null` remains legal at the transport level for genuinely unresolved cases, but it becomes a failed-quality result for ordinary suggestions rather than an acceptable first response.

### 2. Add one bounded repair request, not an open-ended retry loop

After parsing the first response, the service will inspect new and replacement suggestions. If a normal food has no positive weighted suggestion, it will issue one follow-up structured request containing the original context and a concise list of missing requirements. The second response replaces the incomplete candidate set. If it is still incomplete, the preview returns the explicit manual-input state and apply remains blocked.

This avoids unbounded AI cost and latency while addressing the common failure mode where the first response is structurally valid but operationally incomplete.

### 3. Validate consistency server-side before displaying operations

The backend will reject or mark invalid suggestions with non-positive weights, invalid quantities or unknown measuring units. Package suggestions must represent total package weight; for example, six buns at 55 g each should be approximately 330 g. The backend will not invent missing values. The preview may expose an invalid operation for manual correction only when its source is otherwise useful, and the apply endpoint remains the final authority.

### 4. Keep provenance explicit without adding persistence

Preview operations will carry the existing rationale/confidence fields and may add a non-persisted suggestion provenance value such as `ai_estimate` or `ai_repaired`. On apply, values continue to use the existing `weight_source` contract. No model change is planned; if the API contract needs a provenance field, it will be added to Pydantic and Zod only.

### 5. Improve the confirmation dialog around estimates

The Food dialog will display the proposed grams next to each new portion, along with rationale and confidence where available. A missing-weight field remains available for exceptional cases. The apply action stays disabled until every selected operation has a positive weight. Existing weighted rows remain read-only and unselected.

The operation list will use the existing `@dnd-kit` primitives already used by the Food frontend. Dragging changes only the local preview order until confirmation. The first active portion receives rank 1 and therefore becomes the standard portion; subsequent active suggestions receive increasing ranks. Existing weighted rows remain fixed in their current rank and cannot be dragged over or modified by the dialog.

The dialog will also expose a separate "Weitere Portionen mit KI erzeugen" action. It requests a fresh preview, merges only new non-duplicate suggestions into the current local list, and never mutates persisted portions. The action remains available after the initial preview and shows loading/error feedback independently from apply.

### 6. API contract remains preview/apply

No route change is required:

- `POST /api/ingredients/{slug}/portions/magic-wand/preview/`
  - response: preview token, interaction ID, structured operations with positive estimated weights where resolvable, confidence, rationale and manual-review flags.
- `POST /api/ingredients/{slug}/portions/magic-wand/apply/`
  - request: preview token and selected operations with confirmed positive weights.
  - response: active portions and operation summary.

The matching backend schemas in `backend/supply/schemas/portion_magic_wand.py` and Food schemas in `frontend-food/src/schemas/supply.ts` remain synchronized.

### 7. Test the user-visible acceptance case end to end

Backend tests will assert the prompt/repair handling and positive-weight contract using a mocked Gemini response. A deterministic Food test will mock the preview for `Hotdog-Brötchen` and assert that `Stück` displays a positive estimate, such as `55 g`, before apply. The test must also prove that the apply request is not sent before confirmation.

## Risks / Trade-offs

- [AI still produces implausible estimates] → Validate positivity, ranges/consistency where possible, show rationale/confidence, and require confirmation.
- [Additional repair call increases latency and AI cost] → Allow at most one repair call and only trigger it when the response lacks a usable ordinary suggestion.
- [A generic prompt overfits to hotdog buns] → Use the hotdog case as a regression fixture, but phrase rules around ordinary piece foods and contextual product size.
- [Package quantity and weight can be inconsistent] → Treat package weight as total weight and validate it against the suggested unit quantity with a documented tolerance.
- [Manual fallback remains for unusual foods] → Keep the fallback explicit and block apply until the user provides a positive value.
- [Schema changes drift between backend and Food frontend] → Update Pydantic/Zod contract tests in the same change.

## Migration Plan

1. Update the backend prompt, structured response quality checks and bounded repair handling.
2. Update preview schemas and operation mapping without changing persisted models.
3. Update the Food dialog to show estimates, confidence and rationale.
4. Add backend, contract, component and Playwright regression coverage, including `Hotdog-Brötchen`.
5. Run targeted supply tests, Food tests, typecheck, lint and E2E tests.
6. Deploy through the existing Cloud Build and Cloud Run process.

Rollback is an application revision rollback. No data migration is expected; already confirmed weights remain valid and newly proposed values are not persisted until confirmation.

## Open Questions

- Should package suggestions be mandatory for every ingredient, or only for foods whose context contains package information or a recognizable retail form?
- Should the UI show the estimate as `ca. 55 g` whenever confidence is below a threshold, while storing the numeric value unchanged?
