## Why

The portions magic wand can currently return new portion suggestions without a usable weight, even for common piece-based foods such as hotdog buns. The resulting dialog asks the user to supply the value manually instead of providing the expected AI-assisted estimate. The workflow should consistently propose practical new portions with positive, reviewable gram estimates while preserving the existing confirmation and data-integrity safeguards.

## What Changes

- Require the AI portion suggestion flow to propose at least one useful new portion for ordinary ingredients when the current data is incomplete.
- Require positive estimated weights for normal piece-based food suggestions, using the ingredient name, context and product form to estimate the total weight of the proposed portion.
- Add an explicit hotdog-bun acceptance case where `1 Stück` receives a plausible positive estimate, such as approximately 55 g, without hard-coding the final value in the UI.
- Ask the AI for additional practical portion forms where appropriate, such as a single piece and a typical package, with quantities and total weights that remain internally consistent.
- Add bounded retry or repair handling when the AI response omits weights for an otherwise ordinary food, while retaining a manual-review fallback for genuinely unresolvable cases.
- Display estimated weight, confidence and rationale clearly in the confirmation dialog before any mutation.
- Keep weighted existing portions unchanged and keep all apply operations confirmation-gated and atomic.

## Capabilities

### New Capabilities

- `ai-portion-weight-estimation`: AI-assisted positive weight estimates and practical new portion suggestions for ingredients.

### Modified Capabilities

- `portion-magic-wand`: extend the preview contract so ordinary new suggestions are weighted and explainable, while preserving selection, confirmation and atomic apply behavior.
- `ingredient-portion-ai-apply`: preserve server-side validation and provenance when applying AI-estimated weights.

## Impact

- Backend: `supply.services.portion_magic_wand`, Gemini prompt/repair handling, Pydantic preview/apply schemas, and service/API tests.
- Food frontend: ingredient detail magic-wand dialog, Zod contracts, loading/error/empty states, and component/E2E tests.
- AI contract: structured suggestions need positive `proposed_weight_g` values, confidence and rationale; unresolved cases remain explicit rather than silently fabricated.
- Persistence: no new migration is expected unless provenance or retry metadata requires a new persisted field. Existing weight status/source fields remain the source of truth.
