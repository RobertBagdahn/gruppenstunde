## Context

The Ingredient model (`supply/models/ingredient.py`) is a standalone `models.Model` with 30+ nutritional fields. It has full CRUD API endpoints at `/api/ingredients/` and frontend pages at `/ingredients`, `/ingredients/new`, `/ingredients/:slug`. However, the ingredient list is not discoverable via the main navigation dropdown. Additionally, the model lacks a `created_by` field, making it impossible to restrict editing to the creator.

The navigation dropdown ("Inhalte") uses `TOOL_*` constants from `src/lib/toolColors.ts` and renders them in `src/components/Layout.tsx` via the `contentMenuItems` array.

## Goals / Non-Goals

**Goals:**
- Make the ingredient list discoverable via the "Inhalte" navigation dropdown
- Track who created an ingredient (`created_by` field)
- Restrict update/delete to creator or staff users (backend + frontend)

**Non-Goals:**
- Changing the ingredient list/detail page functionality
- Adding ingredients to the HomePage cards
- Adding a "create ingredient" quick-action
- Moderator roles beyond `is_staff`

## Decisions

### 1. TOOL_INGREDIENTS constant placement

Add to `frontend/src/lib/toolColors.ts` following the pattern of `TOOL_RECIPES`:
- `icon: 'egg'`
- `basePath: '/ingredients'`
- `label: 'Zutaten'`
- `gradient`: pick a warm yellow/amber gradient to match the egg theme

**Rationale**: Consistent with existing TOOL_* pattern. No new abstraction needed.

### 2. `created_by` as nullable ForeignKey

```python
created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name="created_ingredients",
)
```

**Rationale**: Nullable because existing ingredients have no creator. `SET_NULL` preserves ingredients when users are deleted.

### 3. Permission check approach

- **Backend** (`supply/api/ingredients.py`): In `update_ingredient` and `delete_ingredient`, check `request.auth.is_staff or ingredient.created_by == request.auth`. Return 403 if neither.
- **Frontend** (`IngredientDetailPage.tsx`): `canEdit = user?.is_staff || user?.id === ingredient.created_by_id`
- **Create endpoint**: Automatically set `created_by = request.auth`

**Rationale**: Simple, no new permission system needed. Mirrors how content types handle authorship.

### 4. API schema change

Add `created_by_id: int | None` to `IngredientOutSchema` (Pydantic) and corresponding `createdById: z.number().nullable()` to Zod schema.

**Rationale**: Expose only the ID, not the full user object. Frontend already has the current user's ID for comparison.

## Risks / Trade-offs

- [Existing ingredients have `created_by=NULL`] → These remain editable only by staff. Acceptable since most were likely imported by admins.
- [No migration backfill] → Not needed. NULL is a valid state meaning "unknown creator."

## Files Affected

| Area | File | Change |
|------|------|--------|
| Model | `backend/supply/models/ingredient.py` | Add `created_by` field |
| Migration | `backend/supply/migrations/XXXX_*.py` | AddField |
| API | `backend/supply/api/ingredients.py` | Permission checks, set created_by on create |
| Schema (BE) | `backend/supply/schemas/` | Add `created_by_id` to out schema |
| Schema (FE) | `frontend/src/schemas/supply.ts` | Add `createdById` |
| Nav constant | `frontend/src/lib/toolColors.ts` | Add `TOOL_INGREDIENTS` |
| Nav menu | `frontend/src/components/Layout.tsx` | Add to `contentMenuItems` |
| Detail page | `frontend/src/pages/supplies/IngredientDetailPage.tsx` | Update `canEdit` logic |
