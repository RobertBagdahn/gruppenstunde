## 1. Portion-Priorität (Backend: supply App)

- [x] 1.1 Add `priority` (IntegerField, default=0) and `is_default` (BooleanField, default=False) fields to `Portion` model in `backend/supply/models/ingredient.py`
- [x] 1.2 Add `clean()` / `save()` logic to ensure only one Portion per Ingredient has `is_default=True`
- [x] 1.3 Run `uv run python manage.py makemigrations supply` and verify migration
- [x] 1.4 Update `PortionOut` Pydantic schema in `backend/supply/schemas/` to include `priority` and `is_default`
- [x] 1.5 Update `PortionCreateIn` and `PortionUpdateIn` schemas to accept `priority` and `is_default`
- [x] 1.6 Update Portion API endpoints (`POST /api/ingredients/{slug}/portions/`, `PATCH`) to handle `priority` and `is_default` fields with auto-reset logic
- [x] 1.7 Update Portion queryset ordering to use `priority` (desc), then `rank` (asc)

## 2. Portion-Priorität (Frontend: Zod + API)

- [x] 2.1 Update `PortionSchema` in `frontend/src/schemas/supply.ts` to include `priority` (number) and `isDefault` (boolean)
- [x] 2.2 Update Portion API hooks if needed in `frontend/src/api/supplies.ts`

## 3. Normportionen-Umstellung (Backend: recipe App)

- [x] 3.1 Change `servings` default from 4 to 1 in Recipe model (`backend/recipe/models/recipe.py`)
- [x] 3.2 Create data migration to normalize existing RecipeItem quantities: `quantity = quantity / recipe.servings`, then set `recipe.servings = 1`
- [x] 3.3 Run `uv run python manage.py makemigrations recipe` and `uv run python manage.py migrate`
- [x] 3.4 Update RecipeItem API responses to include `ingredient_portions` (list of all Portions for the ingredient with priority/is_default), `ingredient_density`, and `ingredient_viscosity`
- [x] 3.5 Update `RecipeItemOut` Pydantic schema to include `ingredient_portions`, `ingredient_density`, `ingredient_viscosity`
- [x] 3.6 Update recipe detail API serialization to populate the new fields from related Ingredient/Portion data

## 4. Normportionen-Umstellung (Frontend: Schemas + Komponenten)

- [x] 4.1 Update `RecipeItemSchema` in `frontend/src/schemas/recipe.ts` to include `ingredientPortions`, `ingredientDensity`, `ingredientViscosity`
- [x] 4.2 Create `frontend/src/utils/unitConversion.ts` utility with `formatQuantity()` function: g→kg (>=1000g), ml→l (>=1000ml), density-based g↔ml conversion, smart rounding (5g/10g/50g steps)
- [x] 4.3 Create `frontend/src/utils/portionDisplay.ts` utility with `calculateNaturalPortions()`: computes natural portion counts from weight_g and portion.weight_g, formats as "ca. X Stück"
- [x] 4.4 Create `PortionScaler` component (`frontend/src/components/recipe/PortionScaler.tsx`): slider/+- buttons, range 1-100, stores selected portion count in local state
- [x] 4.5 Integrate `PortionScaler` into `RecipeDetailPage.tsx`: display scaled quantities with unit conversion and natural portion display for each RecipeItem
- [x] 4.6 Show all available portions for each ingredient (expandable, sorted by priority)

## 5. Shopping App (Backend: Models + Migrations)

- [x] 5.1 Create new Django app `shopping`: `uv run python manage.py startapp shopping`
- [x] 5.2 Create `ShoppingList` model: name, owner FK, source_type (manual/recipe/meal_event), source_id (nullable), created_at, updated_at
- [x] 5.3 Create `ShoppingListItem` model: shopping_list FK, ingredient FK (nullable), name, quantity_g, unit, retail_section, is_checked, checked_by FK (nullable), checked_at (nullable), sort_order, note
- [x] 5.4 Create `ShoppingListCollaborator` model: shopping_list FK, user FK, role (viewer/editor/admin), unique_together (shopping_list, user)
- [x] 5.5 Add `shopping` to `INSTALLED_APPS` in settings
- [x] 5.6 Run `uv run python manage.py makemigrations shopping` and `uv run python manage.py migrate`

## 6. Shopping App (Backend: Schemas)

- [x] 6.1 Create Pydantic schemas in `backend/shopping/schemas.py`: `ShoppingListOut` (name, owner, items_count, checked_count, collaborators_count, source_type, created_at, updated_at)
- [x] 6.2 Create `ShoppingListDetailOut` (+ items grouped by retail_section, collaborators, can_edit)
- [x] 6.3 Create `ShoppingListItemOut` (id, name, quantity_g, unit, retail_section, is_checked, checked_by, checked_at, sort_order, note, ingredient_portions for natural portion display)
- [x] 6.4 Create `ShoppingListCollaboratorOut` (id, user_id, username, role)
- [x] 6.5 Create input schemas: `ShoppingListCreateIn`, `ShoppingListItemCreateIn`, `ShoppingListItemUpdateIn`, `CollaboratorCreateIn`, `CollaboratorUpdateIn`
- [x] 6.6 Create `PaginatedShoppingListOut` pagination wrapper

## 7. Shopping App (Backend: API Endpoints)

- [x] 7.1 Create `backend/shopping/api.py` with Django Ninja router under `/api/shopping-lists/`
- [x] 7.2 Implement `GET /api/shopping-lists/` — list own + shared lists (paginated)
- [x] 7.3 Implement `POST /api/shopping-lists/` — create manual list
- [x] 7.4 Implement `GET /api/shopping-lists/{id}/` — detail with items and collaborators (permission check)
- [x] 7.5 Implement `PATCH /api/shopping-lists/{id}/` — update list name (owner/admin only)
- [x] 7.6 Implement `DELETE /api/shopping-lists/{id}/` — delete list (owner only)
- [x] 7.7 Implement `POST /api/shopping-lists/{id}/items/` — add item (editor/admin/owner)
- [x] 7.8 Implement `PATCH /api/shopping-lists/{id}/items/{item_id}/` — update/check item (editor/admin/owner)
- [x] 7.9 Implement `DELETE /api/shopping-lists/{id}/items/{item_id}/` — remove item (editor/admin/owner)
- [x] 7.10 Implement `POST /api/shopping-lists/{id}/collaborators/` — invite collaborator (admin/owner)
- [x] 7.11 Implement `PATCH /api/shopping-lists/{id}/collaborators/{collab_id}/` — change role (admin/owner)
- [x] 7.12 Implement `DELETE /api/shopping-lists/{id}/collaborators/{collab_id}/` — remove collaborator (admin/owner)
- [x] 7.13 Implement `POST /api/shopping-lists/from-recipe/{recipe_id}/` — create list from recipe with optional `servings` parameter, apply unit conversion
- [x] 7.14 Implement `POST /api/shopping-lists/from-meal-event/{meal_event_id}/` — create list from MealEvent using existing `generate_shopping_list` service
- [x] 7.15 Register shopping router in main API configuration

## 8. Shopping App (Backend: WebSocket)

- [x] 8.1 Add `channels` and `channels-redis` to project dependencies
- [x] 8.2 Configure Django Channels in settings (ASGI application, channel layers with Redis)
- [x] 8.3 Create `backend/shopping/consumers.py` with `ShoppingListConsumer` (WebSocket): authenticate, check permissions, join group
- [x] 8.4 Implement WebSocket event handlers: `item.checked`, `item.unchecked`, `item.added`, `item.removed`, `item.updated`, `list.updated`
- [x] 8.5 Create `backend/shopping/routing.py` with URL pattern `ws/shopping-lists/{id}/`
- [x] 8.6 Update `backend/core/asgi.py` to include Channels routing alongside HTTP

## 9. MealEvent Shopping-List Enhancement (Backend)

- [x] 9.1 Extend `ShoppingListItemOut` in `backend/planner/schemas/` to include `display_quantity` and `natural_portions` fields
- [x] 9.2 Update `generate_shopping_list` service to include ingredient portion data for natural portion display
- [x] 9.3 Add unit conversion logic to shopping list service output (smart rounding, g→kg, ml→l)

## 10. Shopping App (Frontend: Schemas + API)

- [x] 10.1 Create `frontend/src/schemas/shoppingList.ts` with Zod schemas: `ShoppingListSchema`, `ShoppingListDetailSchema`, `ShoppingListItemSchema`, `ShoppingListCollaboratorSchema`
- [x] 10.2 Create `frontend/src/api/shoppingLists.ts` with TanStack Query hooks: `useShoppingLists`, `useShoppingList`, `useCreateShoppingList`, `useUpdateShoppingList`, `useDeleteShoppingList`
- [x] 10.3 Add item mutation hooks: `useAddShoppingListItem`, `useUpdateShoppingListItem`, `useDeleteShoppingListItem`
- [x] 10.4 Add collaborator mutation hooks: `useAddCollaborator`, `useUpdateCollaborator`, `useRemoveCollaborator`
- [x] 10.5 Add export hooks: `useCreateFromRecipe`, `useCreateFromMealEvent`

## 11. Shopping App (Frontend: WebSocket)

- [x] 11.1 Create `frontend/src/hooks/useShoppingListWebSocket.ts` — WebSocket connection manager with reconnection logic
- [x] 11.2 Implement event handling: update TanStack Query cache on `item.checked`, `item.added`, `item.removed`, `item.updated` events
- [x] 11.3 Add optimistic updates for check/uncheck actions

## 12. Shopping App (Frontend: Pages + Components)

- [x] 12.1 Create `frontend/src/pages/shopping/ShoppingListPage.tsx` — list view with own + shared lists, progress indicators, "Neue Liste" button
- [x] 12.2 Create `frontend/src/pages/shopping/ShoppingListDetailPage.tsx` — detail view with items grouped by retail section, checkboxes, progress bar
- [x] 12.3 Create `frontend/src/components/shopping/ShoppingListItemRow.tsx` — single item row with checkbox (44x44px touch target), quantity display with natural portions, strikethrough when checked
- [x] 12.4 Create `frontend/src/components/shopping/CollaboratorManager.tsx` — invite/manage collaborators, role picker, remove button
- [x] 12.5 Create `frontend/src/components/shopping/ShoppingListProgress.tsx` — progress bar showing checked/total items
- [x] 12.6 Add real-time collaborator indicator: show who just checked an item (fade-out animation)
- [x] 12.7 Add routes for `/shopping-lists/` and `/shopping-lists/:id` to React Router

## 13. Recipe + MealEvent Export Integration (Frontend)

- [x] 13.1 Add "Zur Einkaufsliste" button to `RecipeDetailPage.tsx` with dialog for portion count (pre-filled from PortionScaler)
- [x] 13.2 Add "Einkaufsliste erstellen" button to `MealEventDetailPage.tsx`
- [x] 13.3 Implement navigation to created shopping list after export

## 14. Testing

- [x] 14.1 Write pytest tests for Portion priority/is_default logic (supply app)
- [x] 14.2 Write pytest tests for ShoppingList CRUD API endpoints (permissions, create, update, delete)
- [x] 14.3 Write pytest tests for shopping list export from recipe (with scaling)
- [x] 14.4 Write pytest tests for shopping list export from MealEvent
- [x] 14.5 Write pytest tests for collaborator management (invite, role change, remove, permission checks)
- [x] 14.6 Write Vitest tests for `unitConversion.ts` utility (g→kg, ml→l, rounding, density conversion)
- [x] 14.7 Write Vitest tests for `portionDisplay.ts` utility (natural portion calculation)
- [x] 14.8 Write pytest tests for data migration (RecipeItem normalization)
