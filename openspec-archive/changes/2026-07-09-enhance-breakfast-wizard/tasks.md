## 1. Backend: Data Model Changes

- [x] 1.1 Create Django migration: add `visibility` and `shared_groups` fields to Ingredient model
- [x] 1.2 Create Django migration: update Recipe visibility handling (ensure consistency with Content inheritance)
- [x] 1.3 Add index on `(visibility, owner_id, shared_groups)` for query performance
- [x] 1.4 Create Django migration: seed system extras (Marmelade, Honig, Nutella, Zucker, etc.) as Ingredients with `breakfast-extra` tag
- [x] 1.5 Create `breakfast-extra` Tag via data migration (if not exists)
- [x] 1.6 Verify Ingredient.tags and Recipe.tags models accept the new Tag types

## 2. Backend: Pydantic Schemas

- [x] 2.1 Update `backend/supply/schemas/ingredient.py`: add `visibility` (Literal["private", "shared"]) and `shared_group_ids` fields to IngredientCreateIn/IngredientUpdateIn
- [x] 2.2 Update `backend/recipe/schemas/recipe.py`: add `visibility` and `shared_group_ids` to RecipeCreateIn/RecipeUpdateIn
- [x] 2.3 Create response schema for IngredientOut/RecipeOut: include `owner_id`, `owner_name`, `visibility`, `created_by_name`
- [x] 2.4 Update BreakfastCatalogSchema to include `extra_ingredients` list
- [x] 2.5 Create Pydantic schema for visibility selector: `VisibilityIn` with `visibility` + `shared_group_ids` fields

## 3. Backend: API Endpoints - Permission Checks

- [x] 3.1 Implement `_can_view_ingredient(ingredient, user)` → checks visibility + owner + shared_groups
- [x] 3.2 Implement `_can_view_recipe(recipe, user)` → checks visibility + owner + shared_groups
- [x] 3.3 Update `_get_visible_ingredients_qs(user)` to filter by permissions
- [x] 3.4 Update `_get_visible_recipes_qs(user)` to filter by permissions
- [x] 3.5 Add permission checks to GET endpoints: `/api/supplies/ingredients/{slug}/`, `/api/recipes/{id}/`

## 4. Backend: Breakfast Catalog Endpoint

- [x] 4.1 Update `GET /api/supply/breakfast-catalog/` to accept optional `group_id` query param
- [x] 4.2 Filter base_ingredients, topping_ingredients, fat_ingredients by user permissions
- [x] 4.3 Filter drink_ingredients, drink_recipes by user permissions
- [x] 4.4 Add `extra_ingredients` field (all ingredients tagged with `breakfast-extra`, filtered by permissions)
- [x] 4.5 Apply permission checks: System items + User's items + shared items only
- [x] 4.6 Add response includes: `owner_id`, `owner_name`, `created_by_name` for non-system items
- [x] 4.7 Test: unauthenticated request shows only system items
- [x] 4.8 Test: authenticated request shows owned + shared items

## 5. Backend: Create/Update Endpoints

- [x] 5.1 Update `POST /api/supplies/ingredients/` to accept `visibility` and `shared_group_ids`
- [x] 5.2 On ingredient creation: set `owner=request.user`, `visibility=payload.visibility` (default "private")
- [x] 5.3 Bulk-add `shared_group_ids` to ingredient.shared_groups M2M
- [x] 5.4 Update `PATCH /api/supplies/ingredients/{slug}/` to allow visibility/shared_groups updates (only owner can edit)
- [x] 5.5 Same for recipes: `POST /api/recipes/` and `PATCH /api/recipes/{id}/`
- [x] 5.6 Update error handling: 403 if user tries to edit item they don't own
- [x] 5.7 Add validation: `shared_group_ids` must be valid Group IDs that user is member of

## 6. Backend: Tests

- [x] 6.1 Test ingredient visibility: private items not visible to other users
- [x] 6.2 Test ingredient visibility: shared items visible to group members
- [x] 6.3 Test ingredient visibility: system items visible to all
- [x] 6.4 Test breakfast-catalog filtering for unauthenticated user
- [x] 6.5 Test breakfast-catalog filtering for authenticated user with group
- [x] 6.6 Test ingredient create/update permissions
- [x] 6.7 Test recipe visibility and sharing

## 7. Frontend: Zod Schemas Sync

- [x] 7.1 Create `src/schemas/breakfast.ts` updates: add IngredientCreateSchema, RecipeCreateSchema with visibility + shared_group_ids fields
- [x] 7.2 Update BreakfastCatalogSchema response to include extra_ingredients: z.array(...)
- [x] 7.3 Create VisibilitySchema: { visibility: "private" | "shared", shared_group_ids: number[] }
- [x] 7.4 Create UpdateIngredientSchema with visibility handling

## 8. Frontend: Components - Create Dialogs

- [x] 8.1 Create `src/components/breakfast/CreateItemModal.tsx` - generic modal for Ingredient/Recipe creation
- [x] 8.2 Implement form fields: name, description, visibility selector, tag selector
- [x] 8.3 Implement submit: POST to appropriate endpoint (ingredient or recipe)
- [x] 8.4 Handle loading state + error messages (German UI text)
- [x] 8.5 On success: show toast "Zutat/Rezept erstellt", close modal
- [x] 8.6 On error: show validation errors below fields

## 9. Frontend: Components - Tag Selector

- [x] 9.1 Create `src/components/breakfast/TagSelector.tsx` - checkbox list with categories
- [x] 9.2 Group breakfast tags: breakfast-base, breakfast-fat, breakfast-topping, breakfast-drink, breakfast-extra
- [x] 9.3 Group nutritional tags: vegan, vegetarian, gluten-free, bio, etc.
- [x] 9.4 Auto-select relevant breakfast tag based on step context
- [x] 9.5 Allow multi-select (return selected tag IDs)
- [x] 9.6 Test on mobile (responsive)

## 10. Frontend: Components - Visibility Selector

- [x] 10.1 Create `src/components/breakfast/VisibilitySelector.tsx` - radio + group multiselect
- [x] 10.2 Implement: Privat (nur diese Gruppe) vs Mit Gruppen teilen
- [x] 10.3 If shared: show multiselect for available groups
- [x] 10.4 Return: { visibility: private | shared, shared_group_ids: number[] }

## 11. Frontend: Components - Link to Details

- [x] 11.1 Update ingredient/recipe item display in wizard: make name clickable (href)
- [x] 11.2 Add click handler: window.open(/ingredients/{slug}) (new tab)
- [x] 11.3 Optional: Add icon next to names
- [x] 11.4 Test: clicking opens new tab without closing wizard

## 12. Frontend: Components - Shared Indicator

- [x] 12.1 Add visual badge/icon for shared items (e.g., badge or Geteilt)
- [x] 12.2 Show on items in catalog lists if visibility=shared
- [x] 12.3 Hover text: Geteilt mit Gruppe: [group name] or similar

## 13. Frontend: Wizard Integration - Basis/Fett Steps

- [x] 13.1 Update `src/pages/planning/breakfast/StepBasis.tsx`: add "+ Neue Basis erstellen" button
- [x] 13.2 Button opens CreateItemModal with type="ingredient", breakfast_tag="breakfast-base"
- [x] 13.3 After create: refresh breakfast-catalog query (TanStack Query invalidate)
- [x] 13.4 New item appears in list and is selectable
- [x] 13.5 Same for `StepStreichfett.tsx` with breakfast_tag="breakfast-fat"

## 14. Frontend: Wizard Integration - Belag Step

- [x] 14.1 Update `src/pages/planning/breakfast/StepBelag.tsx`: add create button
- [x] 14.2 Opens CreateItemModal with breakfast_tag="breakfast-topping"
- [x] 14.3 Test: new topping appears and can be selected with intensity

## 15. Frontend: Wizard Integration - Extras Step

- [x] 15.1 Update `src/pages/planning/breakfast/StepExtras.tsx`: remove hardcoded extras list
- [x] 15.2 Load extras from `catalog.extra_ingredients` (tag-based)
- [x] 15.3 Add "+ Neues Extra erstellen" button
- [x] 15.4 Opens CreateItemModal with breakfast_tag="breakfast-extra"
- [x] 15.5 Extras displayed as checkboxes (same layout as before, just data-driven)

## 16. Frontend: Wizard Integration - Getränke Step

- [x] 16.1 Update `src/pages/planning/breakfast/StepGetraenke.tsx`: add "+ Neues Getränk-Rezept erstellen" button
- [x] 16.2 Opens CreateItemModal with type="recipe", recipe_type="drink"
- [x] 16.3 After create: new recipe appears in drinks list
- [x] 16.4 Test: recipe selectable with same UX as existing

## 17. Frontend: State Management

- [x] 17.1 Update `src/pages/planning/breakfast/useWizardState.ts`: add modal state (showCreateModal, createType, etc.)
- [x] 17.2 Add callbacks: `openCreateModal(type, breakfastTag)`, `closeCreateModal()`, `submitCreate(payload)`
- [x] 17.3 On submitCreate: call API, refresh catalog query, close modal
- [x] 17.4 Handle create errors: show toast, keep modal open with error message

## 18. Frontend: API Client

- [x] 18.1 Update `src/api/breakfast.ts`: add `createIngredient()` function
- [x] 18.2 Update `src/api/breakfast.ts`: add `createRecipe()` function
- [x] 18.3 Update `useBreakfastCatalog()` to include `extra_ingredients` in response
- [x] 18.4 Add error handling: 400/403 responses show friendly error messages

## 19. Frontend: UI Polish

- [x] 19.1 Test responsive design on mobile (320px minimum)
- [x] 19.2 Ensure modals are accessible (focus management, ESC to close)
- [x] 19.3 Test form validation: required fields, error messages in German
- [x] 19.4 Add loading states: skeleton loaders, disabled buttons while submitting
- [x] 19.5 Test keyboard navigation: Tab through form, Enter to submit
- [x] 19.6 Check Tailwind classes: no inline CSS, use cn() for conditionals

## 20. Testing - End-to-End

- [x] 20.1 E2E test: Create ingredient in Basis step, see it appear, select it, save
- [x] 20.2 E2E test: Create extra in Extras step, verify it appears in list
- [x] 20.3 E2E test: Click ingredient name, verify detail page opens in new tab
- [x] 20.4 E2E test: Share ingredient with another group, verify visible in that group's wizard
- [x] 20.5 E2E test: Create private ingredient, verify not visible in other groups
- [x] 20.6 E2E test: Unauthenticated user sees only system items

## 21. Testing - Units & Integration

- [x] 21.1 Unit test: TagSelector component (select/deselect tags)
- [x] 21.2 Unit test: VisibilitySelector component (radio + multiselect)
- [x] 21.3 Unit test: CreateItemModal form validation
- [x] 21.4 Integration test: Backend permission checks (visibility filters)
- [x] 21.5 Integration test: Breakfast-catalog returns correct filtered items

## 22. Deployment & Migration

- [x] 22.1 Verify all Django migrations run without errors
- [x] 22.2 Test data migration: system extras created correctly
- [x] 22.3 Verify backward compat: existing ingredients work with new visibility fields (backfilled to "private")
- [x] 22.4 Rollback plan: if visibility breaks, can revert migrations
- [x] 22.5 Deploy to staging + test full workflow
- [x] 22.6 Deploy to production with monitoring (Sentry errors, slow queries)

## 23. Documentation & Cleanup

- [x] 23.1 Document new API endpoints in backend README or API docs
- [x] 23.2 Update frontend README with new component usage (CreateItemModal, TagSelector, etc.)
- [x] 23.3 Remove any old hardcoded extras references from code comments
- [x] 23.4 Add comments to explain visibility/sharing logic in models
- [x] 23.5 Clean up any debug console.logs or temporary code
