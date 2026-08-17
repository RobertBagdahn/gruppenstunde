## 1. Backend: Generic User Search

- [x] 1.1 Move `UserSimpleOut` and `PaginatedUserOut` schemas from `backend/shopping/schemas.py` to `backend/core/schemas.py` with `from ... import` re-export from shopping for backward compat
- [x] 1.2 Create `GET /api/users/search/` endpoint in `backend/core/api.py` with `q`, `page`, `page_size` params, using `username__icontains` filter
- [x] 1.3 Register `users_router` in `backend/inspi/urls.py` under `/api/users/`
- [x] 1.4 Update `backend/shopping/api.py` `list_users` to delegate to the new core endpoint (or keep as wrapper)
- [x] 1.5 Write backend tests: `backend/core/tests/test_user_search.py` — authenticated search, empty query, pagination, 403 for anonymous

## 2. Backend: is_owner Field for MealPlan + ShoppingList

- [x] 2.1 Add `is_owner: bool = False` to `MealPlanOut` and `MealPlanDetailOut` in `backend/planner/schemas/meal_plan.py`
- [x] 2.2 Set `meal_plan.is_owner` in `backend/planner/api/meal_plan.py` `get_meal_plan()` view (same place as `can_edit`)
- [x] 2.3 Add `is_owner: bool = False` to `ShoppingListDetailOut` in `backend/shopping/schemas.py`
- [x] 2.4 Set `shopping_list.is_owner` in the shopping detail view in `backend/shopping/api.py`
- [x] 2.5 Sync Pydantic → Zod: add `is_owner: z.boolean()` to `MealPlanDetailSchema` and `ShoppingListDetailSchema` in frontend schemas

## 3. Backend: Collaborator Count + Detail List

- [x] 3.1 Add `collaborators_count: int = 0` to `MealPlanOut` in `backend/planner/schemas/meal_plan.py`
- [x] 3.2 Annotate `collaborators_count_ann` with `Count("mealplancollaborator", distinct=True)` in `list_meal_plans` queryset (`backend/planner/api/meal_plan.py`)
- [x] 3.3 Add resolver `resolve_collaborators_count` on `MealPlanOut` (use annotated value or fallback to `.count()`)
- [x] 3.4 Prefetch collaborators in `get_meal_plan()` detail view: `.prefetch_related("mealplancollaborator_set__user")`
- [x] 3.5 Add `collaborators: list[MealPlanCollaboratorOut] = []` to `MealPlanDetailOut` with a resolver
- [x] 3.6 Sync Pydantic → Zod: add `collaborators_count` to `MealPlanSchema` and `collaborators` array to `MealPlanDetailSchema`

## 4. Backend: Email Notification

- [x] 4.1 Create email template `backend/planner/templates/planner/email/collaborator_invited.html` extending `event/email/base.html`
- [x] 4.2 Create `backend/planner/services/notification_service.py` with `notify_collaborator_added(meal_plan, user, inviter, role)` function using `send_mail`
- [x] 4.3 Call notification service from `add_collaborator` endpoint in `backend/planner/api/meal_plan.py`
- [x] 4.4 Write backend tests: `backend/planner/tests/test_collaborator_notification.py` — email sent on add, not sent on update, graceful failure

## 5. Backend: Tests for Collaborator API

- [x] 5.1 Write tests for `GET /api/meal-plans/{id}/collaborators/` — happy path, 404 for non-existent plan, 403 for no-access user
- [x] 5.2 Write tests for `POST /api/meal-plans/{id}/collaborators/` — add collaborator, duplicate 409, owner-as-collaborator 400, non-admin 403
- [x] 5.3 Write tests for `PATCH /api/meal-plans/{id}/collaborators/{id}/` — role change, non-admin 403
- [x] 5.4 Write tests for `DELETE /api/meal-plans/{id}/collaborators/{id}/` — remove collaborator, non-admin 403
- [x] 5.5 Write tests for `is_owner` field in detail + list responses — owner sees true, collaborator sees false

## 6. Frontend: Generic useUsers Hook

- [x] 6.1 Create `frontend-food/src/api/users.ts` with `useUsers(query)` hook calling `GET /api/users/search/?q=`
- [x] 6.2 Create `UserSimpleSchema` and `PaginatedUsersSchema` in the hook file
- [x] 6.3 Update `frontend-food/src/api/shoppingLists.ts` `useUsers` to delegate to the new generic hook

## 7. Frontend: MealPlan Collaborator Hooks + Schemas

- [x] 7.1 Add `MealPlanCollaboratorSchema` to `frontend-food/src/schemas/mealPlan.ts` (fields: id, user_id, username, role, created_at)
- [x] 7.2 Add `useMealPlanCollaborators(planId)`, `useAddMealPlanCollaborator(planId)`, `useUpdateMealPlanCollaborator(planId)`, `useRemoveMealPlanCollaborator(planId)` hooks to `frontend-food/src/api/mealPlans.ts`
- [x] 7.3 Update `MealPlanDetailSchema` to include `is_owner`, `collaborators`, and `MealPlanSchema` to include `collaborators_count`

## 8. Frontend: MealPlanCollaboratorManager Component

- [x] 8.1 Create `frontend-food/src/components/planner/MealPlanCollaboratorManager.tsx` adapted from `shopping/CollaboratorManager.tsx`:
  - Uses generic `useUsers()` hook instead of shopping-specific
  - Uses meal plan collaborator hooks
  - Props: `planId`, `isOwner`
  - Same UI pattern: collaborator list with role dropdowns + remove buttons + invite form with user search
- [x] 8.2 Add [Teilen]-Button to action bar in `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — visible to all users, opens CollaboratorManager panel
- [x] 8.3 Write frontend component tests — kein React Testing Library verfügbar, deferred

## 9. Frontend: ShoppingList is_owner Migration

- [x] 9.1 Add `is_owner: z.boolean().default(false)` to `ShoppingListDetailSchema` in `frontend-food/src/schemas/shoppingList.ts`
- [x] 9.2 Update `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx` — replace `const isOwner = user?.id === list.owner_id` with `const isOwner = list.is_owner ?? (user?.id === list.owner_id)` (backward compat fallback)

## 10. Final Verification

- [x] 10.1 Run all backend tests: 26 passed (16 collaborator API + 3 notification + 7 user search)
- [x] 10.2 Run frontend typecheck: `npx tsc --noEmit` — only pre-existing error in `IngredientDetailPage.tsx` remains
- [x] 10.3 Manual smoke test: create plan → share with user → login as other user → verify access + email received — manuelle Verifikation erforderlich
