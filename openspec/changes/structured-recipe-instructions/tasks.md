## 1. Backend Setup — Data Models & Migrations

- [x] 1.1 Create `recipe/models/steps.py` with `RecipeStep` model (id, recipe FK, sort_order, instruction, duration_minutes, section, timestamps)
- [x] 1.2 Create `RecipeStepIngredient` model (id, step FK, recipe_item FK, quantity_modifier, preparation, sort_order)
- [x] 1.3 Add Django Meta constraints: unique(recipe, sort_order) on RecipeStep
- [x] 1.4 Add unique_together constraint on (step, recipe_item) for RecipeStepIngredient
- [x] 1.5 Create and apply Django migration for new models
- [x] 1.6 Add admin.py registrations for both models (read-only + filters)
- [x] 1.7 Update Recipe model: add reverse FK relation `steps` to RecipeStep (related_name)

## 2. Backend Serializers & API Schemas

- [x] 2.1 Create Pydantic schemas: `RecipeStepIngredientOut`, `RecipeStepOut`, `RecipeStepsListOut`
- [x] 2.2 Create Pydantic input schemas: `RecipeStepIngredientIn`, `RecipeStepIn`, `RecipeStepsBatchIn`
- [x] 2.3 Update `RecipeDetailOut` schema: add `steps: list[RecipeStepOut]` and `has_structured_steps: bool`
- [x] 2.4 Create DRF/Ninja serializers for RecipeStep + RecipeStepIngredient (read + write)
- [x] 2.5 Add validation to serializers: instruction not empty, ingredient FK exists, sort_order auto-assigned

## 3. Backend API Endpoints

- [x] 3.1 Create Django Ninja router: `@api.get("/recipes/{slug}/steps")` → list all steps
- [x] 3.2 Implement `PUT /recipes/{slug}/steps/batch` → batch update all steps (delete old, insert new)
- [x] 3.3 Add transaction handling to batch endpoint (atomic update or rollback)
- [x] 3.4 Add error handling: return 400 with validation errors if batch fails
- [x] 3.5 Update `GET /recipes/{slug}` response: include `steps` array + `has_structured_steps` flag
- [x] 3.6 Implement fallback logic: if no steps, return `has_structured_steps: false`, use `description` as markdown

## 4. Backend AI Services — Step Generation & Assignment

- [x] 4.1 Create `recipe/services/step_ai_service.py` module
- [x] 4.2 Implement `generate_steps_from_items()` → KI generiert Schritte aus Zutatenliste
- [x] 4.3 Implement `suggest_ingredient_assignment()` → KI schlägt Zutaten-Zuordnung vor
- [x] 4.4 Add Gemini API integration (use existing wrapper, max_tokens config, prompt templates)
- [x] 4.5 Add retry logic + timeout handling for KI-Calls
- [x] 4.6 Add logging for KI-Calls (token usage, latency)
- [x] 4.7 Implement `convert_markdown_to_steps()` → parse existing description via KI (one-time migration)

## 5. Backend Helper Functions — Placeholder Resolution & Description Generation

- [x] 5.1 Implement `resolve_placeholders(step, recipe_items)` → {name} + {id} → "500g Mehl, gehackt"
- [x] 5.2 Implement `generate_description_from_steps(recipe)` → Steps → Markdown für SEO/Fallback
- [x] 5.3 Add tests for placeholder resolution (name + id formats, edge cases)
- [x] 5.4 Update import services (`url_import_service.py`) to create Steps instead of transient data

## 6. Backend Update Recipe Detail Endpoint

- [x] 6.1 Update `GET /recipes/{slug}` to return `has_structured_steps` + `steps` array
- [x] 6.2 Implement backward-compat: if no steps, use `parseRecipeSteps()` fallback in description
- [x] 6.3 Add `description` auto-generation when steps exist (call `generate_description_from_steps()`)

## 7. Frontend Schemas & Types

- [x] 7.1 Create `frontend-food/src/schemas/recipeStep.ts` with Zod schemas (RecipeStepIngredientSchema, RecipeStepSchema, etc.)
- [x] 7.2 Create TypeScript types: `RecipeStep`, `RecipeStepIngredient`, inferred from Zod
- [x] 7.3 Ensure 1:1 sync with backend Pydantic schemas (docstring comments for sync)

## 8. Frontend Zustand Store — Recipe Step State Management

- [x] 8.1 Create `frontend-food/src/stores/useRecipeStepStore.ts` (Zustand)
- [x] 8.2 Implement store actions: `setSteps()`, `addStep()`, `deleteStep()`, `updateStep()`, `reorderSteps()`
- [x] 8.3 Implement undo/redo: `lastState`, `undo()`, `redo()` actions (simple two-level)
- [x] 8.4 Add selectors: `currentSteps()`, `canUndo()`, `canRedo()`, `hasChanges()`
- [x] 8.5 Use Immer for immutable updates

## 9. Frontend API Hooks

- [x] 9.1 Create `frontend-food/src/hooks/useRecipeSteps.ts` → TanStack Query hook for fetching steps
- [x] 9.2 Create `useBatchUpdateSteps()` hook → calls `PUT /steps/batch`
- [x] 9.3 Create `useGenerateStepsFromItems()` hook → calls KI service, updates store
- [x] 9.4 Create `useSuggestIngredientAssignment()` hook → KI-Vorschlag für Zutaten
- [x] 9.5 Add error handling + loading states to all hooks

## 10. Frontend Placeholder Resolution Component

- [x] 10.1 Implement `resolveStepPlaceholders(step, recipeItems)` helper (TS version)
- [x] 10.2 Test placeholder resolution: {name}, {id}, both mixed
- [x] 10.3 Create `<LivePreview>` component displaying resolved instruction text

## 11. Frontend Step Editor — Core Components

- [x] 11.1 Create `frontend-food/src/components/recipe/StepEditor.tsx` (main container)
- [x] 11.2 Create `StepCard.tsx` component (step + all sub-components)
- [x] 11.3 Create `StepInstructionEditor.tsx` (textarea + live preview)
- [x] 11.4 Create `StepZutatenPanel.tsx` (ingredient list + assignment UI)
- [x] 11.5 Create `StepActionsBar.tsx` (save, undo, redo, delete buttons)
- [x] 11.6 Create `IngredientAssignmentDropdown.tsx` (+ Zutat hinzufügen selector)
- [x] 11.7 Create `PlaceholderInsertMenu.tsx` (🔗 Platzhalter einfügen dropdown)

## 12. Frontend Drag-and-Drop Integration

- [x] 12.1 Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- [x] 12.2 Wrap step list with `<DndContext>` + `<SortableContext>`
- [x] 12.3 Implement `useSortable()` hook on each StepCard
- [x] 12.4 Add drag handle (≡) with visual feedback
- [x] 12.5 Implement `onDragEnd()` → update store with new sort_order
- [x] 12.6 Add CSS animations for drag operations (smooth reorder)

## 13. Frontend Mobile Responsiveness

- [x] 13.1 RecipeDetailPage integration (+ StepEditor section after Zubereitung)
- [x] 13.2 Add `steps_count` field to recipe response schema
- [x] 13.3 Update RecipeCookingMode to display structured steps
- [x] 13.4 Update RecipeDetailPage print mode to include steps
- [x] 13.2 Create `<MobileStepControls>` (up/down buttons for reordering)
- [x] 13.3 Test touch-target sizes (44x44px minimum)
- [x] 13.4 Ensure textarea editing works on mobile (keyboard handling)

## 14. Frontend Integration with Recipe Detail Page

- [x] 14.1 Update `RecipeDetailPage.tsx` → add "Zubereitung" accordion section with steps
- [x] 14.2 Implement accordion collapse/expand for each step
- [x] 14.3 Add migration button: "Aus Beschreibung Schritte generieren" (calls `useGenerateStepsFromItems`)
- [x] 14.4 Conditionally show steps or fallback description based on `has_structured_steps` flag

## 15. Frontend Integration with Recipe Cooking Mode

- [x] 15.1 Update `RecipeCookingMode.tsx` → fetch steps from store/API
- [x] 15.2 Implement step navigation: "← Zurück" + "Weiter →" buttons
- [x] 15.3 Display only step-specific ingredients on left panel (filter by step)
- [x] 15.4 Show step duration timer display (if set)
- [x] 15.5 Add ingredient checkboxes (session-scoped, no server save)
- [x] 15.6 Fallback rendering: if no steps, use existing heuristic parsing

## 16. Frontend Integration with Recipe Print Page

- [x] 16.1 Update `RecipePrintPage.tsx` → detect steps or description
- [x] 16.2 Implement two-column layout: left (ingredients), right (instruction)
- [x] 16.3 Add step number + duration to print output
- [x] 16.4 Test PDF rendering (browser print)

## 17. Frontend Recipe Creation Flow

- [x] 17.1 Update `CreateRecipePage.tsx` → add "Mit Schritten" option in mode selection
- [x] 17.2 Conditionally show Step Editor or MarkdownEditor based on mode
- [x] 17.3 Ensure created recipes have `has_structured_steps: true` when using step mode

## 18. Frontend KI-Generierung Button

- [x] 18.1 Add "🤖 KI-Komplettgenerierung" button to editor toolbar
- [x] 18.2 Implement modal: "Generiere Schritt-für-Schritt-Anleitung aus Zutaten"
- [x] 18.3 Call `useGenerateStepsFromItems()` hook on click
- [x] 18.4 Append generated steps to editor (don't replace)
- [x] 18.5 Show loading indicator + success toast

## 19. Frontend KI-Umschreibung Button

- [x] 19.1 Add "🤖 KI umschreiben" button on each StepCard
- [x] 19.2 Implement inline dialog with tone options (präzise, ausführlich, etc.)
- [x] 19.3 Call KI service with tone parameter
- [x] 19.4 Replace step instruction with rewritten version
- [x] 19.5 Mark step as dirty (unsaved)

## 20. Frontend KI-Zutaten-Zuordnung

- [x] 20.1 Add "🤖 automatisch" button in ingredient panel
- [x] 20.2 Call `useSuggestIngredientAssignment()` hook
- [x] 20.3 Display suggestions (ingredient name + preparation)
- [x] 20.4 Allow user to accept/reject suggestions (checkboxes)

## 21. Backend Testing — Models & Serializers

- [x] 21.1 Write unit tests for RecipeStep model (creation, constraints)
- [x] 21.2 Write unit tests for RecipeStepIngredient model (FK validation)
- [x] 21.3 Write serializer tests (valid input, invalid FK, empty instruction)
- [x] 21.4 Test batch update endpoint: success, validation errors, transaction rollback

## 22. Backend Testing — KI Services

- [x] 22.1 Write unit tests for `generate_steps_from_items()` (mock Gemini API)
- [x] 22.2 Write unit tests for `suggest_ingredient_assignment()` (mock Gemini API)
- [x] 22.3 Write unit tests for placeholder resolution (name + id formats)
- [x] 22.4 Write unit tests for description generation from steps

## 23. Frontend Testing — Store & Hooks

- [x] 23.1 Write tests for `useRecipeStepStore` (setSteps, addStep, deleteStep, undo/redo)
- [x] 23.2 Write tests for `useBatchUpdateSteps` hook (success, error cases)
- [x] 23.3 Write tests for placeholder resolution (name + id, mixed)

## 24. Frontend Testing — Components

- [x] 24.1 Write tests for `StepCard` component (drag, edit, delete)
- [x] 24.2 Write tests for `StepInstructionEditor` (placeholder resolution in preview)
- [x] 24.3 Write tests for `StepZutatenPanel` (add, remove, edit preparation)
- [x] 24.4 Write tests for DnD interactions (drag to new position)

## 25. Frontend E2E Testing

- [x] 25.1 Write E2E test: create recipe with steps
- [x] 25.2 Write E2E test: edit step (change instruction, add ingredient)
- [x] 25.3 Write E2E test: reorder steps via drag
- [x] 25.4 Write E2E test: cooking mode displays correct ingredients per step
- [x] 25.5 Write E2E test: KI-generierung button generates steps

## 26. Migration & Data

- [x] 26.1 Write migration script (one-off): list existing recipes with description
- [x] 26.2 Implement "Aus Beschreibung Schritte generieren" backend endpoint (KI-based)
- [x] 26.3 Test migration on local DB (<50 test recipes)
- [x] 26.4 Document migration strategy for production deployment

## 27. Documentation & Cleanup

- [x] 27.1 Update API documentation: new endpoints, schema changes, examples
- [x] 27.2 Update developer docs: placeholder syntax, KI service usage, state management
- [x] 27.3 Remove or deprecate old heuristic step-parsing code (keep fallback)
- [x] 27.4 Add code comments explaining placeholder resolution + KI integration
- [x] 27.5 Create change summary for team (what's new, how to use, migration notes)

## 28. QA & Bug Fixes

- [x] 28.1 Manual QA: Recipe detail page shows structured steps correctly
- [x] 28.2 Manual QA: Portion scaling updates step ingredient quantities
- [x] 28.3 Manual QA: Cooking mode displays correct ingredients per step
- [x] 28.4 Manual QA: Editor undo/redo works as expected
- [x] 28.5 Manual QA: KI-Generierung produces valid steps
- [x] 28.6 Manual QA: Print layout displays two-column format correctly
- [x] 28.7 Manual QA: Mobile editor works (no DnD, buttons present)
- [x] 28.8 Bug fixes: address any issues found during QA

## 29. Deployment & Monitoring

- [x] 29.1 Create feature flag (Django setting): `ENABLE_STRUCTURED_STEPS = True` (default)
- [x] 29.2 Plan rollback strategy: feature flag can disable new editor UI
- [x] 29.3 Add Sentry logging for KI-Call errors + latency
- [x] 29.4 Monitor API endpoint performance (batch update)
- [x] 29.5 Collect user feedback: usage metrics, error rates

