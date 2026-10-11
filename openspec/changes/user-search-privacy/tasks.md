## 1. Backend

- [x] 1.1 `public_display_name()` and `search_user_directory()` in `core/services/user_directory.py`
- [x] 1.2 `/api/users/search/` and `/api/shopping-lists/users/` use the service; `UserSimpleOut` is `{ id, display_name }`
- [x] 1.3 Shopping list schemas and WebSocket consumer expose display names only
- [x] 1.4 Tests: name search, exact e-mail lookup, short query, page size, no e-mail in responses and WebSocket events

## 2. Frontends

- [x] 2.1 Food: Zod schemas, `UserSearchSelect` in both collaborator managers, shopping list display names
- [x] 2.2 Main frontend: user search hooks read paginated display names

## 3. Meal plans and weekly planners

- [x] 3.1 `MealPlanCollaboratorOut` returns `display_name` instead of `username`/`first_name`/`last_name`; meal plan `owner_name` uses `public_display_name()`
- [x] 3.2 Planner `CollaboratorOut` returns `display_name` instead of `username`; the invite message names the invitee by display name
- [x] 3.3 Food Zod schema and `MealPlanCollaboratorManager`, main frontend planner schema and `PlannerPage` show `display_name`
- [x] 3.4 Tests: meal plan list/detail, meal plan collaborator list/add, planner detail and invite responses contain no e-mail (`planner/tests/test_privacy.py`)
