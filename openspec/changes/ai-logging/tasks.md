## 1. Settings & Model Foundation

- [x] 1.1 Add `GEMINI_PRICING` dict and `USD_TO_EUR` to `backend/inspi/settings.py`
- [x] 1.2 Add new fields to `AiInteraction` model (prompt_tokens, completion_tokens, total_tokens, thoughts_tokens, cost_eur, pricing_model, is_background)
- [x] 1.3 Create Django migration (`uv run python manage.py makemigrations content`)
- [x] 1.4 Run migration and verify schema (`uv run python manage.py migrate`)

## 2. Gemini Wrapper Refactoring

- [x] 2.1 Add `_extract_usage_metadata()` helper — extracts token counts from response or exception
- [x] 2.2 Add `_calculate_cost_eur()` helper — pricing table lookup + USD→EUR conversion using Decimal math
- [x] 2.3 Add `_truncate_prompt()` helper — strips base64 image data from prompt before storage
- [x] 2.4 Refactor `_create_interaction()` — accept `is_background`, apply prompt truncation
- [x] 2.5 Refactor `_update_interaction()` — accept token fields + cost_eur + pricing_model
- [x] 2.6 Refactor `gemini_call()` — reorder: auth check BEFORE logging, extract tokens and cost, pass `is_background`, set `error_code="client_unavailable"` when client is None
- [x] 2.7 Refactor `gemini_image_call()` — same changes as gemini_call, image-specific pricing logic (Phase 1: text rates for all tokens; Phase 2: activate `image_output_per_1m_usd` after modality spike)
- [x] 2.8 Add internal logging to `gemini_embed()` — create/update AiInteraction with `is_background=True`, return type unchanged
- [x] 2.9 Write tests for Gemini wrapper (`backend/core/tests/test_gemini.py` — token extraction, cost calculation, auth order, is_background)

## 3. Management Command Updates

- [x] 3.1 Update all management commands and scripts using `gemini_call()` to pass `is_background=True`
- [x] 3.2 Affected commands: `normalize_recipe_portions`, `enrich_recipe_metadata`, `generate_cleanup_candidates`, `rename_rewe_ingredients`, `fix_ingredients`, `clean_ingredient_descriptions`, `cleanup_unsuitable_ingredients`, `fix_nutrition_ai.py`, `documents/text_resolver.py`

## 4. Content AI — Schema & API Update (ai_interaction_id)

- [x] 4.1 Add `ai_interaction_id: str | None = None` to Pydantic schemas: `AiImproveTextOut`, `AiSuggestTagsOut`, `AiRefurbishOut`, `AiGenerateImageOut`, `AiSuggestSuppliesOut`
- [x] 4.2 Update `ContentAIService` methods to return `interaction_id`: `improve_text()`, `suggest_tags()`, `refurbish()`, `generate_images()`
- [x] 4.3 Update `ai_supply_service.py` functions to return `interaction_id`: `suggest_recipe_supplies()`, `suggest_materials()`
- [x] 4.4 Update `content/api/ai.py` endpoints to include `ai_interaction_id` in responses (success AND error paths)
- [ ] 4.5 Write/update API tests for content AI endpoints (`backend/content/tests/test_ai_interaction_api.py`)

## 5. Domain AI Endpoints — ai_interaction_id Propagation

- [x] 5.1 Event: Create `GenerateInvitationOut` Pydantic schema with `ai_interaction_id`, update `event/api/events.py` endpoint
- [ ] 5.2 PackingList: Update suggestion response with `ai_interaction_id`, update `packinglist/services/suggestion_service.py`
- [ ] 5.3 Recipe: Propagate `ai_interaction_id` through `recipe_ai_suggest_service.py`, `ai_ingredients_service.py`, `step_ai_service.py`, `suggestion_service.py` and their API endpoints
- [ ] 5.4 Planner: Propagate `ai_interaction_id` through `meal_plan_ai_service.py` and `planner/api/ai_generation.py`
- [x] 5.5 Rename `_interaction_id` → `interaction_id` in all service files

## 6. Admin API — Log Viewer Endpoints

- [x] 6.1 Create Pydantic schemas for admin log: `AiInteractionItemOut` (list without prompt/response), `AiInteractionDetailOut` (with prompt/response), `UserCostOut`, `AiInteractionFilterParams`
- [x] 6.2 Create `GET /api/content/admin/ai-interactions/` — paginated list with filters (context, user_id, success, is_background, has_vote, date_from, date_to, search)
- [x] 6.3 Create `GET /api/content/admin/ai-interactions/{id}/` — detail with full prompt and response
- [x] 6.4 Create `GET /api/content/admin/ai-interactions/user-costs/` — per-user cost aggregation (exclude is_background=True)
- [x] 6.5 Extend `GET /api/content/admin/ai-interactions/stats/` — add `total_cost_eur`, `total_tokens_all`; add cost/token to `by_context` entries; support `?include_background=true` query param; default filters out background
- [ ] 6.6 Write tests for admin log endpoints (`backend/content/tests/test_ai_interaction_api.py`)

## 7. Frontend — Zod Schema Sync

- [x] 7.1 Update `frontend/src/schemas/aiInteraction.ts` — add `AiInteractionItemSchema`, `AiInteractionDetailSchema`, `UserCostSchema`
- [x] 7.2 Update `frontend/src/schemas/content.ts` — add `ai_interaction_id` to AI response Zod schemas
- [x] 7.3 Update `frontend-food/src/schemas/aiInteraction.ts` — sync with main frontend
- [x] 7.4 Update `frontend-food/src/schemas/content.ts` — add `ai_interaction_id` to food AI response schemas

## 8. Frontend — API Hooks

- [ ] 8.1 Add `useAiInteractions()` hook — paginated list with filter params (`frontend/src/api/aiInteraction.ts`)
- [ ] 8.2 Add `useAiInteractionDetail()` hook — single interaction detail
- [ ] 8.3 Add `useAiUserCosts()` hook — user cost aggregation
- [ ] 8.4 Update existing AI hooks to parse `ai_interaction_id` from responses (`frontend/src/api/ai.ts`, `frontend-food/src/api/ai.ts`)

## 9. Frontend — Admin Pages

- [ ] 9.1 Create `KiLogPage` — paginated table with filter bar, expand for prompt/response (`frontend/src/pages/admin/KiLogPage.tsx`)
- [ ] 9.2 Create `KiKostenPage` — per-user cost table sorted by cost descending (`frontend/src/pages/admin/KiKostenPage.tsx`)
- [ ] 9.3 Update existing admin stats page to show cost data (`frontend/src/pages/admin/` + useAiInteractionStats hook)
- [ ] 9.4 Add routes for new admin pages in `frontend/src/App.tsx`
- [ ] 9.5 Add admin navigation entries for KI-Log and KI-Kosten

## 10. Frontend — Vote Buttons Integration

- [ ] 10.1 Add `AiVoteButtons` to `ContentStepper` (refurbish, improve_text result areas)
- [ ] 10.2 Add `AiVoteButtons` to `InlineEditor` (improve_text result)
- [ ] 10.3 Add `AiVoteButtons` to `TitleImageEditor` (generate_image result)
- [ ] 10.4 Add `AiVoteButtons` to `AiCreateDialog` / AI suggest supply dialogs
- [ ] 10.5 Add `AiVoteButtons` to `StepInvitationText` (event invitation result)
- [ ] 10.6 Add `AiVoteButtons` to `PackingListDetailPage` (packing list AI suggestions)
- [ ] 10.7 In `frontend-food`: Add `AiVoteButtons` to recipe AI wizard steps and ingredient creation stepper
- [ ] 10.8 In `frontend-food`: Add `AiVoteButtons` to meal plan AI suggest dialog

## 11. Verification

- [x] 11.1 Run backend tests: `uv run python manage.py test`
- [x] 11.2 Run backend lint: `uv run ruff check backend/`
- [ ] 11.3 Run frontend typecheck: `npm run typecheck` (in frontend/)
- [ ] 11.4 Run frontend-food typecheck: `npm run typecheck` (in frontend-food/)
- [ ] 11.5 Manual smoke test: trigger AI calls, verify tokens and costs in admin log, verify vote buttons appear and work
