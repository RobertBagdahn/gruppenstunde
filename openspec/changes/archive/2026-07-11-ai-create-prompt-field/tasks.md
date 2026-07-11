## 1. Backend Schema & API

- [x] 1.1 Change `RecipeAiCreateIn` in `recipe/schemas/recipes.py`: replace `title: str` + `description: str = ""` with `prompt: str`
- [x] 1.2 Update `ai_create` endpoint in `recipe/api/recipes.py`: use `payload.prompt` instead of `payload.title` / `payload.description`
- [x] 1.3 Update `ai_create_recipe()` signature in `recipe/services/recipe_ai_suggest_service.py`: `ai_create_recipe(title, description, user)` → `ai_create_recipe(prompt, user)`
- [x] 1.4 Update Gemini prompt construction in `ai_create_recipe()`: replace `f"Recherchiere das Rezept '{title}'..."` with `f"Erstelle ein vollständiges Rezept zu dieser Beschreibung: {prompt}"`
- [x] 1.5 Run `uv run python manage.py check` to verify no import errors

## 2. Backend Tests

- [x] 2.1 Add test for `POST /api/recipes/ai-create/` with valid `{ "prompt": "..." }` in `recipe/tests/`
- [x] 2.2 Add test for 403 when unauthenticated
- [x] 2.3 Run tests: `uv run pytest recipe/tests/ -xvs`

## 3. Frontend Zod Schema

- [x] 3.1 Add `RecipeAiCreateInSchema` to `frontend-food/src/schemas/recipe.ts`: `z.object({ prompt: z.string().min(1) })`
- [x] 3.2 Export `RecipeAiCreateIn` type

## 4. Frontend API Hook

- [x] 4.1 Add `useRecipeAiCreate()` mutation hook to `frontend-food/src/api/recipes.ts`
- [x] 4.2 Hook validates request body against `RecipeAiCreateInSchema` before sending
- [x] 4.3 Hook validates response against `RecipeDetailSchema`
- [x] 4.4 Hook invalidates relevant query caches on success

## 5. Frontend Component Update

- [x] 5.1 Replace raw `fetch()` in `WizardStepMethod.tsx` `handleAiGenerate` with `useRecipeAiCreate()` hook
- [x] 5.2 Remove manual CSRF token handling (handled by hook)
- [x] 5.3 Use mutation states (`isPending`, `error`) for UI feedback
- [x] 5.4 Run `npm run typecheck` in `frontend-food/` to verify type safety

## 6. OpenSpec Update

- [x] 6.1 Verify delta spec in `openspec/specs/recipe-ai-suggest/spec.md` matches the updated behavior after implementation
