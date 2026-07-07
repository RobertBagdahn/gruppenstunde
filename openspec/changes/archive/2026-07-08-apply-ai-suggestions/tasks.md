## 1. Backend: Service & Schemas

- [x] 1.1 Create `AiApplyIn` Pydantic schema (reuse `AiSuggestOut` structure, may alias/import)
- [x] 1.2 Create `AiApplyOut` Pydantic schema with `applied: int`, `skipped: int`, `skipped_items: list[SkippedItem]`
- [x] 1.3 Create `SkippedItem` Pydantic schema with `day: date`, `meal_type: str`, `recipe_id: int`, `reason: str`
- [x] 1.4 Implement `MealPlanAiService.apply_suggestions(meal_plan, suggestions_data)` — validates recipe IDs, matches meals by date+meal_type, creates MealItems in `atomic()` transaction

## 2. Backend: API Endpoint

- [x] 2.1 Add `POST /{meal_plan_id}/apply-ai/` endpoint to `ai_generation.py` with auth check (owner/collaborator)
- [x] 2.2 Register endpoint router in `inspi/urls.py` — ensure it's registered before the generic `meal_plan_router` to avoid 405

## 3. Backend: Tests

- [x] 3.1 Write `test_apply_ai_happy_path` — creates a plan, applies suggestions, verifies MealItems created
- [x] 3.2 Write `test_apply_ai_skipped_recipe` — non-existent recipe_id → skipped, rest applied
- [x] 3.3 Write `test_apply_ai_skipped_meal_type` — invalid meal_type → skipped
- [x] 3.4 Write `test_apply_ai_plan_not_found` → 404
- [x] 3.5 Write `test_apply_ai_unauthenticated` → 403
- [x] 3.6 Write `test_apply_ai_unauthorized` — non-owner/collaborator → 403

## 4. Frontend: Zod Schema & API Hook

- [x] 4.1 Add `AiApplyOutSchema`, `AiApplySkippedItemSchema` Zod schemas (1:1 with Pydantic) in `frontend-food/src/schemas/mealPlan.ts`
- [x] 4.2 Add `useApplyAiSuggestions()` mutation hook in `frontend-food/src/api/mealPlans.ts`

## 5. Frontend: Fix Wizard handleCreate

- [x] 5.1 Replace dead loop in `handleCreate` (lines 102–111) with sequential `createMutation → applyMutation`
- [x] 5.2 Handle partial success (create succeeds, apply fails → warning toast, still navigate)
- [x] 5.3 Update `StepCockpit` to show apply loading state alongside create loading state

## 6. Integration Check

- [x] 6.1 Run backend tests: `uv run pytest planner/tests/test_apply_ai -xvs` → 6/6 pass
- [x] 6.2 Run full planner test suite: `uv run pytest planner/tests/test_apply_ai.py planner/tests/test_ai_generation.py -xvs` → 12/12 pass
- [x] 6.3 Frontend typecheck: `cd frontend-food && npx tsc --noEmit` → no new errors
- [x] 6.4 Frontend lint: `cd frontend-food && npm run lint` → no new errors
- [ ] 6.5 Manual test: wizard create with AI strategy → verify recipes appear in plan
