## 1. Backend Model & Migration

- [x] 1.1 Add `source_url = URLField(max_length=500, blank=True, default="")` to Recipe model
- [x] 1.2 Run `makemigrations` and `migrate`

## 2. Backend Service: URL Import Pipeline

- [x] 2.1 Create `recipe/services/url_import_service.py` with main `import_recipe_from_url(url, user)` function
- [x] 2.2 Implement web fetching with httpx (async, User-Agent header, timeout)
- [x] 2.3 Implement schema.org/Recipe JSON-LD extraction from HTML (BeautifulSoup)
- [x] 2.4 Implement ingredient text search pre-filter (icontains on Ingredient.name + IngredientAlias.name, top-5 per ingredient)
- [x] 2.5 Build Gemini prompt: recipe extraction + ingredient matching + new ingredient data generation (single call with Google Search Grounding)
- [x] 2.6 Parse Gemini JSON response and map to internal data structures
- [x] 2.7 Create new Ingredients (with nutritional values, scores, aliases, portions) for unmatched items
- [x] 2.8 Assemble recipe draft response with RecipeItems (quantity, measuring_unit, note)

## 3. Backend API & Schemas

- [x] 3.1 Create Pydantic schemas: `RecipeImportUrlInput`, `RecipeImportUrlResponse`, `RecipeItemDraft`, `CreatedIngredientInfo`
- [x] 3.2 Create API endpoint `POST /api/recipes/import-from-url/` using `gemini_call()` with auth
- [x] 3.3 Add error handling: 422 for invalid URL, unreachable, no recipe found

## 4. Frontend: URL Import UI

- [x] 4.1 Add third option card "Von URL importieren" with link icon on recipe creation Step 1
- [x] 4.2 Create URL input field + "Importieren" button (shown after card selection)
- [x] 4.3 Add loading state with message "Rezept wird analysiert... Das kann einen Moment dauern."
- [x] 4.4 Create Zod schemas matching backend response (`recipeImportUrlResponseSchema`)
- [x] 4.5 Create TanStack Query mutation hook `useRecipeImportUrl`
- [x] 4.6 On success: navigate to Step 2 (Bearbeiten) with pre-filled recipe data and ingredients

## 5. Integration & Polish

- [x] 5.1 Add `source_url` to recipe edit/detail schemas (Pydantic + Zod)
- [x] 5.2 Display source_url on recipe detail page (optional link "Originalrezept")
- [ ] 5.3 Test end-to-end: URL with schema.org → preview → edit → save
- [ ] 5.4 Test end-to-end: URL without schema.org (Gemini fallback) → preview → edit → save
- [ ] 5.5 Test ingredient matching: verify existing ingredients are reused, new ones created with full data
