## 1. Backend: AI-Generation Service

- [ ] 1.1 Create `backend/planner/schemas/ai_generation.py` — Pydantic schemas `AiSuggestIn`, `AiSuggestDay`, `AiSuggestMeal`, `AiSuggestOut`
- [ ] 1.2 Create `backend/planner/services/meal_plan_ai_service.py` — `MealPlanAiService` with `generate_suggestions()` using `gemini_call()`, prompt construction, JSON response parsing, and recipe_id validation
- [ ] 1.3 Create `backend/planner/api/ai_generation.py` — `POST /api/meal-plans/ai-suggest/` endpoint with auth check, 60s timeout, and structured error responses (502 for parse errors, 504 for timeout)
- [ ] 1.4 Register the new router in `backend/inspi/urls.py` under `/api/meal-plans/`
- [ ] 1.5 Write backend tests for `POST /api/meal-plans/ai-suggest/` (happy path, auth, timeout, invalid JSON, missing recipe_ids)

## 2. Frontend: Wizard Custom Hook

- [ ] 2.1 Create `frontend-food/src/pages/planning/wizard/useMealPlanWizardState.ts` — Custom hook with step navigation, form state, localStorage persistence (key: `meal-plan-wizard`), version check, and cleanup on submit/abort
- [ ] 2.2 Add Zod schema for wizard state in `frontend-food/src/schemas/mealPlan.ts` — `MealPlanWizardStateSchema` with all settings + strategy + ai prompt + ai response fields

## 3. Frontend: Wizard UI Components

- [ ] 3.1 Create `frontend-food/src/pages/planning/wizard/MealPlanWizardPage.tsx` — Main page component that renders step progression bar, current step, and handles step transitions
- [ ] 3.2 Create `frontend-food/src/pages/planning/wizard/StepBasicSettings.tsx` — Step 1 with name, portions, start/end datetime, nutritional tags, and the Einfach/Erweitert-Toggle exposing ExtendedSettingsSection
- [ ] 3.3 Create `frontend-food/src/pages/planning/wizard/ExtendedSettingsSection.tsx` — Expandable section with reserve factor, budget, day-part factors, meal default times, visibility, is_template
- [ ] 3.4 Create `frontend-food/src/pages/planning/wizard/StepStrategy.tsx` — Step 2 with three radio-card options (Leer / Referenz / KI), reference plan dropdown when Referenz is selected
- [ ] 3.5 Create `frontend-food/src/pages/planning/wizard/StepAiPrompt.tsx` — Step 2a with textarea for prompt, generate button, loading state, and AI suggestion preview list
- [ ] 3.6 Create `frontend-food/src/pages/planning/wizard/StepCockpit.tsx` — Step 3/4 with readable summary of all settings and selected strategy details, plus create button

## 4. Frontend: Routing and Integration

- [ ] 4.1 Add route `/meal-plans/new` in `frontend-food/src/App.tsx` pointing to `MealPlanWizardPage`
- [ ] 4.2 Update `frontend-food/src/pages/planning/MealEventListPage.tsx` — Change "Neuer Essensplan" button/CTA from opening dialog to navigating to `/meal-plans/new`
- [ ] 4.3 Add `useAiMealPlanSuggest()` hook in `frontend-food/src/api/mealPlans.ts` — TanStack mutation for `POST /api/meal-plans/ai-suggest/`

## 5. Schema Sync

- [ ] 5.1 Add Zod schema for AI suggestion response (`AiSuggestOutSchema`, `AiSuggestDaySchema`, `AiSuggestMealSchema`) in `frontend-food/src/schemas/mealPlan.ts`

## 6. Tests

- [ ] 6.1 Write backend tests for `POST /api/meal-plans/ai-suggest/` endpoint
- [ ] 6.2 Write frontend tests for `useMealPlanWizardState` hook (step navigation, localStorage, version check, cleanup)
- [ ] 6.3 Write frontend tests for wizard page rendering and step transitions
