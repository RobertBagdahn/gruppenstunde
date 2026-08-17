## 1. Backend: Model & Migration

- [x] 1.1 Add `created_by` ForeignKey field to `Ingredient` model in `backend/supply/models/ingredient.py`
- [x] 1.2 Run `uv run python manage.py makemigrations supply` and verify migration
- [x] 1.3 Run `uv run python manage.py migrate`

## 2. Backend: Schema & API

- [x] 2.1 Add `created_by_id: int | None` to `IngredientOutSchema` in `backend/supply/schemas/`
- [x] 2.2 In `create_ingredient` endpoint, set `created_by=request.auth` on creation
- [x] 2.3 In `update_ingredient` endpoint, add permission check: return 403 if user is not creator and not `is_staff`
- [x] 2.4 In `delete_ingredient` endpoint, add same permission check

## 3. Frontend: Navigation

- [x] 3.1 Add `TOOL_INGREDIENTS` constant to `frontend/src/lib/toolColors.ts` (icon: `egg`, basePath: `/ingredients`, label: `Zutaten`)
- [x] 3.2 Import `TOOL_INGREDIENTS` in `frontend/src/components/Layout.tsx` and add to `contentMenuItems` array after recipes

## 4. Frontend: Schema & Permissions

- [x] 4.1 Add `created_by_id: z.number().nullable()` to ingredient schema in `frontend/src/schemas/supply.ts`
- [x] 4.2 Update `canEdit` logic in `frontend/src/pages/supplies/IngredientDetailPage.tsx` to `user?.is_staff || user?.id === ingredient.created_by_id`
