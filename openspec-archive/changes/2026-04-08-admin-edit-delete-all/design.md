## Context

The Inspi platform has four content types (Session, Blog, Game, Recipe) that share a permission model where `can_edit` is computed dynamically per request. Staff users (`is_staff=True`) are already authorized in the backend to edit and delete all content. However, the frontend has gaps:

1. **No delete button** on content detail pages (Session, Blog, Game, Recipe). Only the Event detail view has delete.
2. **No edit/delete icons** on content list cards (`ContentCard`, `RecipeCard`).
3. **No `can_delete` field** — the API only returns `can_edit`. For Session, Blog, and Game, delete is staff-only (stricter than edit), but the frontend cannot distinguish this.
4. **Delete API hooks exist** (`useDeleteSession`, `useDeleteBlog`, `useDeleteGame`, `useDeleteRecipe`) but are never wired to any UI.

Current permission logic:
- `content/api/helpers.py:enrich_content_with_interactions()` sets `can_edit = is_staff OR is_author`
- Delete endpoints check `is_staff` only (Session, Blog, Game) or `is_staff OR is_author` (Recipe)
- List endpoints do not return `can_edit` or `can_delete` per item

## Goals / Non-Goals

**Goals:**
- Add `can_delete` computed field alongside `can_edit` in all content API responses (detail + list)
- Add delete button with confirmation dialog on all content detail pages
- Add edit/delete action icons on content cards in list views (for authorized users)
- Ensure consistent delete permission: staff-only for all content types

**Non-Goals:**
- Changing permissions for PackingList, Planner, MealPlan, Event, or Supply types (already working)
- Adding bulk delete or multi-select on list views
- Changing the admin panel (`/admin/`) — this is about the public-facing frontend
- Adding new Django permission framework usage (keep inline permission checks)

## Decisions

### 1. Separate `can_delete` field instead of reusing `can_edit`

**Decision**: Add a new `can_delete: bool` field to both detail and list response schemas.

**Why**: Edit and delete have different permission levels. For Session, Blog, and Game, edit is open to authors + staff, but delete is staff-only. Conflating these into one field would either over-grant delete access or under-show edit UI.

**Alternative considered**: Only use `can_edit` and add client-side `is_staff` check for delete. Rejected because the frontend should not need to understand permission logic — the backend should be the source of truth.

### 2. Enrich list items with permissions in the paginate helper

**Decision**: Extend `paginate_queryset()` in `content/api/helpers.py` to accept an optional `request` parameter and enrich each item with `can_edit`/`can_delete` before returning.

**Why**: Centralizes the permission enrichment. All four content list endpoints use this helper, so the change applies everywhere.

**Alternative considered**: Compute permissions in the frontend based on `user.is_staff` and item authors. Rejected because it leaks backend permission logic into the frontend and would require returning author IDs in list responses (currently not present).

### 3. Standardize Recipe delete to staff-only

**Decision**: Change `recipe/api/recipes.py` delete endpoint to require `is_staff`, matching Session, Blog, and Game.

**Why**: Consistency. Currently Recipe allows author-delete while the other three types don't. This is confusing and was likely unintentional.

### 4. Admin actions on cards via overlay icons

**Decision**: Add edit (pencil) and delete (trash) icon buttons as an overlay on `ContentCard` and `RecipeCard`, visible only when `can_edit`/`can_delete` is true. Icons appear on hover (desktop) or always visible (mobile).

**Why**: Matches the existing `InlineEditor` hover-reveal pattern. Keeps the card clean for regular users while giving admins quick access.

**Alternative considered**: Action menu (three-dot dropdown). Rejected for now — simpler icons are faster for admins who need to manage many items.

### 5. Delete confirmation via existing `ConfirmDialog` component

**Decision**: Use the existing `ConfirmDialog` component (already used in Event detail) for delete confirmation on all content types.

**Why**: Consistent UX pattern, no new components needed.

## Affected Files

**Backend:**
- `backend/content/schemas/base.py` — Add `can_delete: bool = False` to `ContentDetailOut` and `ContentListOut`
- `backend/content/api/helpers.py` — Add `can_delete` to `enrich_content_with_interactions()`, add permission enrichment to `paginate_queryset()`
- `backend/session/api.py` — Pass `request` to paginate helper
- `backend/blog/api.py` — Pass `request` to paginate helper
- `backend/game/api.py` — Pass `request` to paginate helper
- `backend/recipe/api/recipes.py` — Pass `request` to paginate helper, change delete permission to staff-only

**Frontend:**
- `frontend/src/schemas/content.ts` — Add `can_delete` to `ContentDetailSchema` and `ContentListItemSchema`
- `frontend/src/components/content/ContentCard.tsx` — Add edit/delete icon overlay with callbacks
- `frontend/src/components/recipe/RecipeCard.tsx` — Add edit/delete icon overlay with callbacks
- `frontend/src/pages/sessions/SessionDetailPage.tsx` — Add delete button + `ConfirmDialog`
- `frontend/src/pages/blogs/BlogDetailPage.tsx` — Add delete button + `ConfirmDialog`
- `frontend/src/pages/games/GameDetailPage.tsx` — Add delete button + `ConfirmDialog`
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — Add delete button + `ConfirmDialog`
- `frontend/src/pages/sessions/SessionListPage.tsx` — Pass permission callbacks to cards
- `frontend/src/pages/blogs/BlogListPage.tsx` — Pass permission callbacks to cards
- `frontend/src/pages/games/GameListPage.tsx` — Pass permission callbacks to cards
- `frontend/src/pages/recipes/RecipeListPage.tsx` — Pass permission callbacks to cards

**No database migrations required** — `can_edit` and `can_delete` are computed fields.

## API Endpoint Changes

No new endpoints. Existing endpoints get additional response fields:

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/sessions/` | GET | List items now include `can_edit`, `can_delete` |
| `/api/sessions/{slug}` | GET | Response now includes `can_delete` |
| `/api/blogs/` | GET | List items now include `can_edit`, `can_delete` |
| `/api/blogs/{slug}` | GET | Response now includes `can_delete` |
| `/api/games/` | GET | List items now include `can_edit`, `can_delete` |
| `/api/games/{slug}` | GET | Response now includes `can_delete` |
| `/api/recipes/` | GET | List items now include `can_edit`, `can_delete` |
| `/api/recipes/{slug}` | GET | Response now includes `can_delete` |

## Risks / Trade-offs

**[Performance] List permission checks add N queries per page** → Mitigation: The `is_staff` check is a single boolean on the user object. The `authors.filter()` for `can_edit` on list items adds one query per item. Mitigation: prefetch `authors` in the queryset before pagination, or batch-check author membership with a single `IN` query. For pages of 20 items with ~1 author each, this is negligible.

**[UX] Delete on list cards could cause accidental deletion** → Mitigation: Always require confirmation via `ConfirmDialog`. Soft-delete means data is recoverable by staff via `all_objects` manager.

**[Breaking] Recipe authors can no longer delete their own recipes** → Mitigation: This aligns with the other three content types. Staff can always delete. Authors who need something removed can change status to "archived" or contact staff.

## Open Questions

None — the scope is well-defined and follows existing patterns.
