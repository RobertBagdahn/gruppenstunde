## Why

`GET /api/users/search/`, `GET /api/shopping-lists/users/` and the shopping list responses exposed usernames, which are e-mail addresses for password and social accounts. Without a query the user search listed every account, so any logged-in user could collect all e-mail addresses.

## What Changes

- User search returns `{ id, display_name }` only; `display_name` is the scout name, the profile name or the account name, otherwise „Inspi-Nutzer #<id>“ – never an e-mail or username.
- User search requires a query of at least 2 characters and allows at most 20 results per page. Name queries match name fields only; a query containing `@` is a case-insensitive exact e-mail lookup returning at most one user.
- Shopping lists expose `owner_display_name`, collaborator `display_name` and item `checked_by_display_name` instead of usernames. WebSocket events carry `sender` (display name) and `sender_id`.
- Food collaborator invites (shopping lists, meal plans) search instead of loading a full user dropdown.

## Capabilities

### Modified Capabilities
- `user-search`: privacy-safe response, required query, smaller page size.
- `user-profiles`: „Benutzersuche“ returns display names only.

## Impact

- Backend: `core/services/user_directory.py`, `core/api.py`, `core/schemas.py` (`UserSimpleOut`), `shopping/api.py`, `shopping/schemas.py`, `shopping/consumers.py`.
- Food frontend: `api/users.ts`, `schemas/shoppingList.ts`, `components/shared/UserSearchSelect.tsx`, collaborator managers, shopping list detail page and WebSocket hook.
- Main frontend: `api/users.ts`, `api/planner.ts` read the paginated `{ id, display_name }` response.
