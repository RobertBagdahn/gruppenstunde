## 1. Backend: Ingredient AI Suggest Service

- [x] 1.1 Create `IngredientSuggestAllSchema` Pydantic model with nutrition, ratings, physical fields (all Optional), plus `portions: list[PortionSuggestion] | None` and `aliases: list[str] | None`
- [x] 1.2 Create `PortionSuggestion` Pydantic model with `name: str` and `weight_g: float`
- [x] 1.3 Create `suggest_all_fields(ingredient, user)` service function using `gemini_call()` with `tools=[types.Tool(google_search=types.GoogleSearch())]` and `response_schema=IngredientSuggestAllSchema`, model `gemini-2.5-flash`
- [x] 1.4 Create response schema `IngredientSuggestAllOut` for the API

## 2. Backend: Ingredient AI Create Service

- [x] 2.1 Create `IngredientAiCreateSchema` Pydantic model (full ingredient fields + portions + aliases, non-optional)
- [x] 2.2 Create `ai_create_ingredient(name, user)` service function that calls Gemini with Search Grounding, creates Ingredient + Portions + Aliases in DB, returns created instance
- [x] 2.3 Generate slug from name, handle uniqueness

## 3. Backend: Recipe AI Suggest Service

- [x] 3.1 Create `RecipeSuggestAllSchema` Pydantic model with description, difficulty, duration_minutes, servings, recipe_type, scout_levels, tags (all Optional)
- [x] 3.2 Create `suggest_recipe_metadata(recipe, user)` service function using Gemini + Search Grounding with the existing recipe title and ingredients as context
- [x] 3.3 Create response schema `RecipeSuggestAllOut`

## 4. Backend: Recipe AI Create Service

- [x] 4.1 Create `RecipeAiCreateSchema` Pydantic model with title, description, difficulty, duration_minutes, servings, recipe_type, items (list of ingredient_name + quantity + unit)
- [x] 4.2 Create `ai_create_recipe(title, description, user)` service function: Gemini call → create Recipe → fuzzy-match/create Ingredients → create RecipeItems
- [x] 4.3 Implement ingredient matching logic: search by name and aliases, create new if not found

## 5. Backend: API Endpoints

- [x] 5.1 Add `POST /api/ingredients/{slug}/ai-suggest-all/` in `supply/api/` with auth check, 404 handling
- [x] 5.2 Add `POST /api/ingredients/ai-create/` in `supply/api/` with auth check, input `{ name: str }`
- [x] 5.3 Add `POST /api/recipes/{id}/ai-suggest-all/` in `recipe/api/` with auth + edit-permission check
- [x] 5.4 Add `POST /api/recipes/ai-create/` in `recipe/api/` with auth check, input `{ title: str, description?: str }`

## 6. Frontend: Zod Schemas + API Hooks

- [x] 6.1 Add `IngredientSuggestAllSchema` Zod schema in `schemas/supply.ts` (all fields nullable)
- [x] 6.2 Add `RecipeSuggestAllSchema` Zod schema in `schemas/recipe.ts` (all fields nullable)
- [x] 6.3 Add `useAiSuggestIngredientAll(slug)` mutation hook in `api/supplies.ts`
- [x] 6.4 Add `useAiCreateIngredient()` mutation hook in `api/supplies.ts`
- [x] 6.5 Add `useAiSuggestRecipeAll(recipeId)` mutation hook in `api/recipes.ts`
- [x] 6.6 Add `useAiCreateRecipe()` mutation hook in `api/recipes.ts`

## 7. Frontend: Shared AI Suggest Dialog Component

- [x] 7.1 Create `AiSuggestDialog` base component in `components/shared/` with: loading skeleton, grouped suggestion list, checkboxes, "Alle auswählen"/"Ausgewählte übernehmen" buttons
- [x] 7.2 Support field types: scalar (text/number), enum (select), list (portions/aliases/tags) with individual item checkboxes
- [x] 7.3 Compare current vs suggested values, only show diffs

## 8. Frontend: Ingredient Zauberstab

- [x] 8.1 Add Zauberstab icon button to `IngredientDetailPage.tsx` header (next to edit/delete), visible only for authenticated users
- [x] 8.2 Wire `AiSuggestDialog` with `useAiSuggestIngredientAll` — on apply: PATCH scalar fields via `useUpdateIngredient`, create portions via `useCreatePortion`, create aliases via `useCreateAlias`
- [x] 8.3 Deduplicate portions (skip if name already exists)

## 9. Frontend: Ingredient AI Create

- [x] 9.1 Add Zauberstab option to ingredient creation flow (e.g. button on ingredient list page or in create dialog)
- [x] 9.2 Simple input dialog: name → call `useAiCreateIngredient` → navigate to created ingredient detail page

## 10. Frontend: Recipe Zauberstab

- [x] 10.1 Add Zauberstab icon button to recipe edit/detail view, visible for users with edit permission
- [x] 10.2 Wire `AiSuggestDialog` with `useAiSuggestRecipeAll` — on apply: PATCH recipe metadata via `useUpdateRecipe`

## 11. Frontend: Recipe AI Create

- [x] 11.1 Add Zauberstab option to recipe creation flow (button on create page or list page)
- [x] 11.2 Simple input dialog: title + optional description → call `useAiCreateRecipe` → navigate to created recipe detail page
