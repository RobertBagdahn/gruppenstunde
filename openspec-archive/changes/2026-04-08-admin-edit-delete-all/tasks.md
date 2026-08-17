## 1. Backend: Schemas erweitern

- [x] 1.1 Add `can_delete: bool = False` to `ContentDetailOut` in `backend/content/schemas/base.py`
- [x] 1.2 Add `can_edit: bool = False` and `can_delete: bool = False` to `ContentListOut` in `backend/content/schemas/base.py`

## 2. Backend: Permission-Berechnung zentralisieren

- [x] 2.1 Add `can_delete` computation to `enrich_content_with_interactions()` in `backend/content/api/helpers.py` — `can_delete = is_authenticated and is_staff`
- [x] 2.2 Create new `enrich_list_with_permissions(request, items)` helper in `backend/content/api/helpers.py` that iterates items and sets `can_edit`/`can_delete`, short-circuiting for anonymous users
- [x] 2.3 Export `enrich_list_with_permissions` in `backend/content/base_api.py` shim

## 3. Backend: Content-List-Endpunkte anpassen

- [x] 3.1 In `backend/session/api.py`: add `prefetch_related("authors")`, convert items to list, call `enrich_list_with_permissions(request, items)`
- [x] 3.2 In `backend/blog/api.py`: add `prefetch_related("authors")`, convert items to list, call `enrich_list_with_permissions(request, items)`
- [x] 3.3 In `backend/game/api.py`: add `prefetch_related("authors")`, convert items to list, call `enrich_list_with_permissions(request, items)`
- [x] 3.4 In `backend/recipe/api/recipes.py`: add `prefetch_related("authors")` to all queryset branches, call `enrich_list_with_permissions` after `paginate_queryset()`

## 4. Backend: Recipe delete permission vereinheitlichen

- [x] 4.1 Change `delete_recipe` in `backend/recipe/api/recipes.py` to require `is_staff` only (remove author-delete permission)
- [x] 4.2 Add `can_delete` computation to recipe detail endpoints (separate from `can_edit`) — `can_delete = is_staff`

## 5. Frontend: Zod Schemas synchronisieren

- [x] 5.1 Add `can_delete: z.boolean().default(false)` to `ContentDetailSchema` in `frontend/src/schemas/content.ts`
- [x] 5.2 Add `can_edit: z.boolean().default(false)` and `can_delete: z.boolean().default(false)` to `ContentListItemSchema` in `frontend/src/schemas/content.ts`

## 6. Frontend: Delete-Button auf Detailseiten

- [x] 6.1 Add delete button with `ConfirmDialog` to `SessionDetailPage.tsx` — visible when `can_delete` is true, calls `useDeleteSession`, redirects to list on success with toast
- [x] 6.2 Add delete button with `ConfirmDialog` to `BlogDetailPage.tsx` — visible when `can_delete` is true, calls `useDeleteBlog`, redirects to list on success with toast
- [x] 6.3 Add delete button with `ConfirmDialog` to `GameDetailPage.tsx` — visible when `can_delete` is true, calls `useDeleteGame`, redirects to list on success with toast
- [x] 6.4 Add delete button with `ConfirmDialog` to `RecipeDetailPage.tsx` — visible when `can_delete` is true, calls `useDeleteRecipe`, redirects to list on success with toast

## 7. Frontend: Edit/Delete-Icons auf Content-Cards

- [x] 7.1 Add optional `canEdit`, `canDelete`, `onEdit`, `onDelete` props to `ContentCard.tsx` — render pencil and trash icon overlay (hover on desktop, always visible on mobile)
- [x] 7.2 Add optional `canEdit`, `canDelete`, `onEdit`, `onDelete` props to `RecipeCard.tsx` — render pencil and trash icon overlay
- [x] 7.3 Wire `canEdit`/`canDelete` from list API response to `ContentCard` in `SessionListPage.tsx` with navigation and delete handlers
- [x] 7.4 Wire `canEdit`/`canDelete` from list API response to `ContentCard` in `BlogListPage.tsx` with navigation and delete handlers
- [x] 7.5 Wire `canEdit`/`canDelete` from list API response to `ContentCard` in `GameListPage.tsx` with navigation and delete handlers
- [x] 7.6 Wire `canEdit`/`canDelete` from list API response to `RecipeCard` in `RecipeListPage.tsx` with navigation and delete handlers
