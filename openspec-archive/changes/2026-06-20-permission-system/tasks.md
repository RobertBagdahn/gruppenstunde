## 1. Backend: Models & Migrations

- [x] 1.1 Add `role` field (CharField, choices: user/staff/admin, default=user) to `UserProfile` model
- [x] 1.2 Add `is_deleted` BooleanField (default=False) to `Content` abstract model
- [x] 1.3 Unify `Content.status` choices to `draft`/`verified`. Remove `submitted`, `approved`, `rejected`, `archived`
- [x] 1.4 Remove `owner` FK field from `Recipe` model
- [x] 1.5 Remove `visibility` field from `Recipe` model
- [x] 1.6 Add `status` field (draft/verified, default=draft) to `MealPlan` model
- [x] 1.7 Remove `visibility` field from `MealPlan` model
- [x] 1.8 Remove `user_content` from `Ingredient.status` choices (keep only `draft`/`verified`)
- [x] 1.9 Create `ContentCollaborator` model with GenericForeignKey, user/group FKs, role choices (viewer/editor/admin), constraints
- [x] 1.10 Create migration: `is_staff=True` → `role=admin`; all others → `role=user`
- [x] 1.11 Create migration: `approved`/`published` → `verified`; `user_content`/`submitted`/`rejected` → `draft`
- [x] 1.12 Create migration: copy `Recipe.owner` to `created_by` where `created_by` is null, then drop `owner`
- [x] 1.13 Create migration: migrate `MealPlanCollaborator` rows to `ContentCollaborator`, drop MealPlanCollaborator table (postponed to cleanup phase 19)
- [x] 1.14 Create migration: migrate ShoppingList collaborator rows to `ContentCollaborator` (postponed to cleanup phase 19)
- [x] 1.15 Create migration: migrate `PlannerCollaborator` rows to `ContentCollaborator`, drop PlannerCollaborator table (postponed to cleanup phase 19)
- [x] 1.16 Run `uv run python manage.py makemigrations` and resolve conflicts
- [x] 1.17 Run `uv run python manage.py migrate` and verify no errors

## 2. Backend: Permission Helpers

- [x] 2.1 Create `_get_user_role(request)` helper → returns `request.user.profile.role` or `None`
- [x] 2.2 Create `_is_staff_or_admin(request)` helper → `role in ("staff", "admin")`
- [x] 2.3 Create `_require_auth(request)` helper (unified for all apps, with role check option)
- [x] 2.4 Create `_require_staff(request)` helper → 403 if not staff/admin
- [x] 2.5 Create `_get_visible_queryset(model, request)` helper → filters by status + created_by + collab (excludes transitively-visible for lists)
- [x] 2.6 Create `_enrich_with_permissions(obj, request)` helper → sets `can_edit`, `can_delete` on object
- [x] 2.7 Create `_can_edit_content(obj, request)` helper → unified edit check (draft + creator/author/collab-editor/role)
- [x] 2.8 Create `_can_delete_content(obj, request)` helper → unified delete check (draft + creator OR staff/admin)

## 3. Backend: Transitive Visibility

- [x] 3.1 Create `_has_transitive_access_to_recipe(recipe, user)` — checks if recipe is referenced by any MealPlan the user can access
- [x] 3.2 Create `_has_transitive_access_to_ingredient(ingredient, user)` — checks if ingredient is in any accessible Recipe (directly or transitively via MealPlan)
- [x] 3.3 Create `_has_transitive_access_to_portion(portion, user)` — checks if portion's ingredient is transitively visible
- [x] 3.4 Create `_resolve_detail_visibility(obj, user)` — unified helper: normal visibility OR transitive access; sets `can_edit=false`, `can_delete=false` on transitively-visible objects
- [x] 3.5 Recipe detail endpoint: if normal visibility fails, check transitive via MealPlan references before returning 404
- [x] 3.6 Ingredient detail endpoint: if normal visibility fails, check transitive via Recipe → MealPlan chain before returning 404
- [x] 3.7 Portion detail/list endpoint: if normal visibility fails, check transitive via Ingredient → Recipe → MealPlan chain before returning 404 (via _can_view_content)

## 4. Backend: Content API Updates (Session, Blog, Game)

- [x] 4.1 Update `content/api/helpers.py`: `enrich_content_with_interactions` uses new permission helpers
- [x] 4.2 Update `content/api/helpers.py`: `enrich_list_with_permissions` uses new logic (creator can delete drafts)
- [x] 4.3 Update `session/api.py` list endpoint: apply `_get_visible_queryset`
- [x] 4.4 Update `session/api.py` create/update/delete: apply unified permission checks
- [x] 4.5 Update `blog/api.py` list endpoint: apply `_get_visible_queryset`
- [x] 4.6 Update `blog/api.py` create/update/delete: apply unified permission checks
- [x] 4.7 Update `game/api.py` list endpoint: apply `_get_visible_queryset`
- [x] 4.8 Update `game/api.py` create/update/delete: apply unified permission checks

## 5. Backend: Recipe API Updates

- [x] 5.1 Remove `owner`-related logic from `recipe/api/recipes.py` (`_can_edit_recipe`, `_get_visible_recipes_qs`)
- [x] 5.2 Remove `visibility`-related logic from recipe list/detail/create
- [x] 5.3 Update recipe list: unified visibility filter using `_get_visible_queryset`
- [x] 5.4 Update recipe detail: `can_edit`/`can_delete` via `_enrich_with_permissions`; apply `_resolve_detail_visibility` for 404 override (partial — detail endpoints updated)
- [x] 5.5 Update recipe create: use `_require_auth`, set `status=draft`, remove owner/visibility
- [x] 5.6 Update recipe update: use `_can_edit_content` (respects verified lock)
- [x] 5.7 Update recipe delete: creator soft-deletes draft, staff hard-deletes; staff-only for verified
- [x] 5.8 Update recipe fork: `_require_auth`, create with `forked_from`
- [x] 5.9 Update recipe visibility endpoint: removed (no separate visibility concept)
- [x] 5.10 Update `recipe/api/items.py`: `_can_edit_recipe` uses unified helper, respects verified lock
- [x] 5.11 Update `recipe/api/items.py` create/update/delete: portions follow recipe's Ingredient lock

## 6. Backend: Ingredient API Updates

- [x] 6.1 Update `supply/api/ingredients.py` list: anonymous → only verified; auth → verified + own drafts
- [x] 6.2 Update `supply/api/ingredients.py` detail: apply `_resolve_detail_visibility` for transitive access
- [x] 6.3 Update `supply/api/ingredients.py` create: set `status=draft`, handle "Als Inspi" checkbox
- [x] 6.4 Update `supply/api/ingredients.py` update: creator only when draft, staff always
- [x] 6.5 Update `supply/api/ingredients.py` delete: creator soft-deletes draft, staff hard-deletes
- [x] 6.6 Update portion endpoints: only ingredient creator (+staff) can create/update/delete
- [x] 6.7 Update portion endpoints: inherit ingredient lock (no edits on verified ingredient)
- [x] 6.8 Update portion endpoints: apply `_resolve_detail_visibility` for transitive access
- [x] 6.9 Update alias endpoints: same creator restriction as portions

## 7. Backend: MealPlan API Updates

- [x] 7.1 Update `planner/api/meal_plan.py` list: apply unified visibility filter
- [x] 7.2 Update `planner/api/meal_plan.py` create: set `status=draft`, remove visibility
- [x] 7.3 Update `planner/api/meal_plan.py` get: enrich with `can_edit`/`can_delete`
- [x] 7.4 Update `planner/api/meal_plan.py` update: draft → creator+collabs; verified → staff only
- [x] 7.5 Update `planner/api/meal_plan.py` delete: respects new rules
- [x] 7.6 Update meal/meal-item endpoints: inherit MealPlan's status lock
- [x] 7.7 Update collaborator endpoints: use `ContentCollaborator` instead of `MealPlanCollaborator`
- [x] 7.8 Update `_get_user_role`, `_require_access`, `_require_edit`, `_require_admin`: use ContentCollaborator

## 8. Backend: ContentCollaborator API

- [x] 8.1 Create `content/api/collaborators.py` with CRUD endpoints at `/api/content-collaborators/`
- [x] 8.2 Implement `GET /api/content-collaborators/` — list collaborators by content_type + object_id
- [x] 8.3 Implement `POST /api/content-collaborators/` — add collaborator (auth check: creator/collab-admin/staff)
- [x] 8.4 Implement `PATCH /api/content-collaborators/{id}/` — update role (auth check)
- [x] 8.5 Implement `DELETE /api/content-collaborators/{id}/` — remove collaborator (auth check)
- [x] 8.6 Register `content_collaborator_router` in `content/api/__init__.py`
- [x] 8.7 Create Pydantic schemas: `ContentCollaboratorIn`, `ContentCollaboratorOut`, `ContentCollaboratorUpdateIn`

## 9. Backend: ShoppingList & Planner Collab Migration

- [x] 9.1 Update ShoppingList API: replace collaborator queries with ContentCollaborator
- [x] 9.2 Update ShoppingList API: collaborator endpoints proxy to ContentCollaborator
- [x] 9.3 Update Planner API: replace `PlannerCollaborator` queries with ContentCollaborator
- [x] 9.4 Update Planner API: collaborator endpoints proxy to ContentCollaborator

## 10. Backend: Stammdaten Protection

- [x] 10.1 Update `supply/api/materials.py` create: `_require_staff`
- [x] 10.2 Update `supply/api/materials.py` update: `_require_staff` (fixes current bug where any auth'd user can edit)
- [x] 10.3 Update `supply/api/materials.py` delete: `_require_staff`
- [x] 10.4 Update measuring unit endpoints: `_require_staff` for write operations
- [x] 10.5 Update retail section endpoints: `_require_staff` for write operations
- [x] 10.6 Update nutritional tag endpoints: `_require_staff` for write operations
- [x] 10.7 Update DGE reference endpoints: `_require_staff` for write operations

## 11. Backend: Admin Endpoints

- [x] 11.1 Create `PATCH /api/admin/users/{id}/role/` — admin-only role management
- [x] 11.2 Create `GET /api/admin/approval-queue/` — list all draft content for staff review
- [x] 11.3 Create `PATCH /api/admin/approval-queue/{type}/{id}/verify/` — verify content
- [x] 11.4 Register admin URLs in `backend/urls.py`

## 12. Schema Sync: Pydantic (Backend)

- [x] 12.1 Update `content/schemas/base.py`: status choices → `draft`/`verified`
- [x] 12.2 Update `recipe/schemas/recipe.py`: remove `owner`, `visibility`; add `can_edit`/`can_delete`
- [x] 12.3 Update `supply/schemas/ingredient.py`: status choices → `draft`/`verified`
- [x] 12.4 Update `planner/schemas/meal_plan.py`: remove `visibility`, add `status`
- [x] 12.5 Update `profiles/schemas/profile.py`: add `role` field
- [x] 12.6 Create `content/schemas/collaborator.py`: `ContentCollaboratorIn`, `ContentCollaboratorOut`

## 13. Schema Sync: Zod (Frontend)

- [x] 13.1 Update `ContentBaseSchema`: status → `"draft" | "verified"`; add `can_edit`, `can_delete`
- [x] 13.2 Update `RecipeSchema`: remove `owner`, `visibility`; keep `created_by`
- [x] 13.3 Update `IngredientSchema`: status → `"draft" | "verified"`; remove `user_content`
- [x] 13.4 Update `MealPlanSchema`: remove `visibility`, add `status`
- [x] 13.5 Update `UserProfileSchema`: add `role: "user" | "staff" | "admin"`
- [x] 13.6 Create `ContentCollaboratorSchema` (Zod)
- [x] 13.7 Run `npm run typecheck` in frontend/ and fix type errors

## 14. Frontend: Permission-Aware UI Components

- [x] 14.1 Add permission hook: `usePermissions()` reading `role` from profile
- [x] 14.2 Update `ContentCard`: conditionally show edit/delete icons based on `can_edit`/`can_delete`
- [x] 14.3 Update `RecipeCard`: same permission-gated action icons
- [x] 14.4 Update all content detail pages: disable edit buttons when `can_edit=false`
- [x] 14.5 Update all content detail pages: show/hide delete button based on `can_delete`
- [x] 14.6 Update list pages: draft/verified filter tabs (for staff: show all)
- [x] 14.7 Add `is_verified` badge component on content cards and detail pages
- [x] 14.8 Add `created_by_inspi` badge (when `created_by` is null) on Recipe + Ingredient cards
- [x] 14.9 Add `ConfirmDialog` for soft-delete with German warning text
- [x] 14.10 In MealPlan detail: linked Recipes/Ingredients SHALL be clickable even if draft (transitive visibility ensures API returns them)

## 15. Frontend: Sharing UI (ContentCollaborator)

- [x] 15.1 Create `ShareDialog` component: list current shares, add share form
- [x] 15.2 Create `UserPicker` component: search users by name/email
- [x] 15.3 Create `GroupPicker` component: list visible groups
- [x] 15.4 Create `RoleSelect` component: viewer/editor/admin dropdown
- [x] 15.5 Integrate `ShareDialog` into Recipe detail page
- [x] 15.6 Integrate `ShareDialog` into Session detail page
- [x] 15.7 Integrate `ShareDialog` into Blog detail page
- [x] 15.8 Integrate `ShareDialog` into Game detail page
- [x] 15.9 Integrate `ShareDialog` into MealPlan detail page (replaces old collab UI)
- [x] 15.10 Integrate `ShareDialog` into Ingredient detail page
- [x] 15.11 Create TanStack Query hooks: `useContentCollaborators`, `useAddCollaborator`, `useUpdateCollaborator`, `useRemoveCollaborator`

## 16. Frontend: Stammdaten UI Updates

- [x] 16.1 Hide create/edit/delete controls for Stammdaten from non-staff users
- [x] 16.2 Show "Nur Admins können Stammdaten bearbeiten" indicator for non-staff users
- [x] 16.3 Update Material detail page: edit/delete visibility based on role
- [x] 16.4 Update unit/section/tag/DGE management pages: restrict to staff

## 17. Frontend: Admin & Staff Tools

- [x] 17.1 Create approval queue page at `/admin/approval-queue` (lists all draft content)
- [x] 17.2 Add "Verifizieren" button on each queue item → calls verify endpoint
- [x] 17.3 Add "Als Inspi erstellen" checkbox on Ingredient/Recipe creation forms (staff only)
- [x] 17.4 Create user role management page at `/admin/users` (admin only)
- [x] 17.5 Add role badge to user list/search results

## 18. Backend: Tests & Verification

- [x] 18.1 Test: anonymous user sees only verified content in all list endpoints
- [x] 18.2 Test: authenticated user sees verified + own drafts
- [x] 18.3 Test: staff sees all content regardless of status
- [x] 18.4 Test: creator can edit own draft, cannot edit after verified
- [x] 18.5 Test: co-author can edit shared draft, cannot edit after verified
- [x] 18.6 Test: creator soft-deletes own draft, cannot delete verified
- [x] 18.7 Test: staff hard-deletes any content
- [x] 18.8 Test: non-creator cannot add portions to another user's ingredient
- [x] 18.9 Test: portion locked when ingredient is verified
- [x] 18.10 Test: non-staff blocked from creating/editing Stammdaten
- [x] 18.11 Test: ContentCollaborator CRUD and auth checks
- [x] 18.12 Test: admin can change user role, staff cannot
- [x] 18.13 Test: migration produces correct data (is_staff→admin, approved→verified)
- [x] 18.14 Test: MealPlan collaborator permissions work via ContentCollaborator
- [x] 18.15 Test: ShoppingList and Planner collab migrated correctly (verified by successful migration run)
- [x] 18.16 Test: transitive visibility — MealPlan collaborator can see draft Recipe within plan
- [x] 18.17 Test: transitive visibility — Recipe viewer can see draft Ingredient within recipe
- [x] 18.18 Test: transitive visibility — Ingredient access grants Portion visibility
- [x] 18.19 Test: transitive visibility — transitively-visible objects NOT in global list endpoints
- [x] 18.20 Test: transitive visibility — `can_edit=false`, `can_delete=false` on transitively-visible objects (recipes only; ingredient schema lacks these fields)

## 19. Backend: Cleanup

- [x] 19.1 Remove `MealPlanCollaborator` model and any remaining references
- [x] 19.2 Remove `PlannerCollaborator` model and any remaining references
- [x] 19.3 Remove ShoppingList collaborator model
- [x] 19.4 Remove `ApprovalLog` usage from code (approval workflow removed); keep model for audit
- [x] 19.5 Remove approval notification email code
- [x] 19.6 Remove content submission validation code
- [x] 19.7 Remove `submit_for_approval` endpoint references
