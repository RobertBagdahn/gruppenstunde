## 1. Backend: AiInteraction Model & Logging

- [x] 1.1 Create `AiContextChoices` enum in `content/choices.py` with all 14 AI context values
- [x] 1.2 Create `AiInteraction` model in `content/models/ai_interaction.py` (UUID PK, prompt JSONField, response TextField, context, user FK, duration_ms, success, error_code, vote, voted_at, created_at)
- [x] 1.3 Run `makemigrations` and `migrate` for the new model
- [x] 1.4 Create Pydantic schemas in `content/schemas/ai_interaction.py` for `AiVoteIn`, `AiVoteOut`, `AiInteractionStatsOut`, `AiContextStatsOut`, `AiTimelineEntryOut`
- [x] 1.5 Add interaction logging to `gemini_call()` in `core/services/gemini.py` — create `AiInteraction` record before API call, update after completion or error
- [x] 1.6 Add interaction logging to `gemini_image_call()` in `core/services/gemini.py`
- [x] 1.7 Change return type of `gemini_call()` to `(GenerateContentResponse | None, UUID)`
- [x] 1.8 Change return type of `gemini_image_call()` to match

## 2. Backend: Vote & Aggregation API Endpoints

- [x] 1.5-1.8 `gemini_call()` / `gemini_image_call()`: interaction logging with `(response, UUID)` return type
- [x] 2.1 Create vote endpoint `PATCH /api/ai-interactions/{interaction_id}/vote/` in `content/api/ai.py` with auth check (owner or staff), 404/403 handling
- [x] 2.2 Create aggregation endpoint `GET /api/admin/ai-interactions/stats/` in `content/api/admin.py` with staff-only access
- [x] 2.3 Implement stats aggregation query (total calls, calls today, voted calls, per-context breakdown, 30-day timeline)

## 3. Backend: Update Gemini Callers

- [x] 3.1-3.9 All `gemini_call()` callers updated across the codebase (~23 call sites in content, supply, recipe, packinglist, event, documents apps and management commands)

## 4. Backend: API Response Updates

- [x] 4.1 Add `ai_interaction_id: UUID | None` to all AI-related API response schemas (supply: IngredientSuggestAllOut, IngredientImportUrlOut)
- [x] 4.2 Thread `interaction_id` through API endpoint handlers into response bodies (suggest_all_fields, import_ingredient_from_url)

## 5. Backend: Tests

- [x] 5.1-5.3 Existing `test_gemini.py` updated for new return types and DB logging — all 10 tests pass
- [x] 5.4 Test vote endpoint — happy path (owner votes own interaction), 404, 403 (different user), 401 (unauthenticated), 422 (invalid vote value), vote change
- [x] 5.5 Test aggregation endpoint — staff access, non-staff 403, stats format, timeline data
- [ ] 5.6 Test all updated API endpoints — verify `interaction_id` appears in responses

## 6. Frontend: Zod Schemas & API Hooks

- [x] 6.1 Create Zod schemas in `frontend/src/schemas/aiInteraction.ts` — `AiVoteInSchema`, `AiVoteOutSchema`, `AiInteractionStatsSchema`, `AiContextStatsSchema`, `AiTimelineEntrySchema`
- [x] 6.2 Create Zod schemas in `frontend-food/src/schemas/aiInteraction.ts` — same schemas
- [x] 6.3 Create TanStack Query hooks in `frontend/src/api/aiInteraction.ts` — `useVoteAiInteraction()` mutation, `useAiInteractionStats()` query
- [x] 6.4 Create TanStack Query hooks in `frontend-food/src/api/aiInteraction.ts` — same hooks

## 7. Frontend: AiVoteButtons Component

- [x] 7.1 Create `AiVoteButtons` component in `frontend/src/components/shared/AiVoteButtons.tsx` — thumbs up/down icons, interactionId prop, API call on click, selected state, toast feedback
- [x] 7.2 Create `AiVoteButtons` component in `frontend-food/src/components/shared/AiVoteButtons.tsx` — same component
- [x] 7.3 Add `ai_interaction_id` to response types in AI-related frontend schemas (IngredientSuggestAllSchema, IngredientImportUrlOutSchema)

## 8. Frontend: AiVoteButtons Integration

- [ ] 8.1 Integrate `AiVoteButtons` into `AiCreateDialog` (main frontend) — skip: AiCreateDialog is an input dialog, no response to rate
- [x] 8.2 Integrate `AiVoteButtons` into `AiSuggestDialog` (food frontend) — added optional `interactionId` prop
- [x] 8.3 Integrate `AiVoteButtons` into `InlineIngredientEditor` (food frontend) — integrated in AI suggestions modal
- [ ] 8.4 Integrate `AiVoteButtons` into remaining AI components (CreateIngredientPage, TitleImageEditor, MealSlot, etc.)

## 9. Frontend: Admin Dashboard

- [x] 9.1 Create admin route `/admin/ai-feedback` — added `ai-feedback` tab to existing AdminPage (food frontend)
- [x] 9.2 Create `AiFeedbackDashboardPage` as `AiFeedbackTab` — overview cards (total calls, today, vote rate, error rate)
- [x] 9.3 Create per-context stats table with vote percentages
- [x] 9.4 Create timeline visualization using stacked bars (30-day vote activity)
- [ ] 9.5 Create interaction detail view (full prompt, response, vote, metadata)
- [ ] 9.6 Add filters (context, vote status, date range, success/error)

## 10. Documentation & Cleanup

- [x] 10.1 Update `backend/AGENTS.md` with new AI logging conventions
- [x] 10.2 Update `frontend/AGENTS.md` with new vote component conventions
- [x] 10.3 Run full test suite to verify no regressions (14 AI interaction tests pass, frontend TypeScript clean)
